import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@Prisma/services';
import type {
  CategoriaIncidencia,
  LugarIncidencia,
} from '../dto/crear-incidencia.dto.js';
import type { IncidenciaCreadaEntity } from '../dto/incidencia-creada.dto.js';
import {
  AreaIncidenciaInactivaError,
  AreaIncidenciaInexistenteError,
  CantidadEvidenciasIncidenciaInvalidaError,
  LugarIncidenciaInvalidoError,
  RolIncidenciaNoAutorizadoError,
  UnidadIncidenciaAjenaError,
  UnidadIncidenciaInexistenteError,
  UsuarioIncidenciaNoDisponibleError,
} from '../errors/incidencias.errors.js';
import type { EvidenciaArchivoAlmacenada } from '../storage/evidencias.storage.js';

export type IncidenciaUserRole = 'RESIDENTE' | 'ADMINISTRADOR' | 'SEGURIDAD';

export interface IncidenciaUserAccess {
  isActive: boolean;
  rol: IncidenciaUserRole;
}

export interface IncidenciaUnidadAccess {
  existe: boolean;
  vinculada: boolean;
}

export interface IncidenciaAreaAccess {
  activa: boolean;
}

export interface IncidenciaEvidenciaLectura {
  id: string;
  incidenciaId: string;
  ruta: string;
  mime: string;
  tamanoBytes: number;
  residenteId: string;
  responsableId: string | null;
}

export interface CrearIncidenciaPersistencia {
  residenteId: string;
  lugarTipo: LugarIncidencia;
  unidadId: string | null;
  areaId: string | null;
  categoria: CategoriaIncidencia;
  descripcion: string;
  evidencias: readonly EvidenciaArchivoAlmacenada[];
}

interface IncidenciaInsertada {
  id: string;
  codigo: string;
  categoria: IncidenciaCreadaEntity['categoria'];
  estado: IncidenciaCreadaEntity['estado'];
  createdAt: Date;
}

/** Acceso de lectura de autorización H9, encapsulado en Repository. */
@Injectable()
export class IncidenciasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserAccess(userId: string): Promise<IncidenciaUserAccess | null> {
    const [user] = await this.prisma.$queryRaw<IncidenciaUserAccess[]>`
      SELECT "is_active" AS "isActive", "rol"::text AS "rol"
      FROM "users"
      WHERE "id" = ${userId}::uuid
      LIMIT 1
    `;
    return user ?? null;
  }

  async findUnitAccess(
    unidadId: string,
    residenteId: string,
  ): Promise<IncidenciaUnidadAccess> {
    const [unit] = await this.prisma.$queryRaw<IncidenciaUnidadAccess[]>`
      SELECT
        EXISTS (
          SELECT 1 FROM "Unidad" WHERE "id" = ${unidadId}::uuid
        ) AS "existe",
        EXISTS (
          SELECT 1 FROM "UsuarioUnidad"
          WHERE "unidadId" = ${unidadId}::uuid
            AND "userId" = ${residenteId}::uuid
        ) AS "vinculada"
    `;
    return unit;
  }

  async findAreaAccess(areaId: string): Promise<IncidenciaAreaAccess | null> {
    const [area] = await this.prisma.$queryRaw<IncidenciaAreaAccess[]>`
      SELECT "activa" AS "activa"
      FROM "AreaComun"
      WHERE "id" = ${areaId}::uuid
      LIMIT 1
    `;
    return area ?? null;
  }

  /** Busca ambos registros en una sola consulta y verifica su relación. */
  async findEvidenceForRead(
    incidenciaId: string,
    evidenciaId: string,
  ): Promise<IncidenciaEvidenciaLectura | null> {
    const [evidencia] = await this.prisma.$queryRaw<
      IncidenciaEvidenciaLectura[]
    >`
      SELECT
        e."id"::text AS "id",
        i."id"::text AS "incidenciaId",
        e."ruta" AS "ruta",
        e."mime" AS "mime",
        e."tamano_bytes" AS "tamanoBytes",
        i."residente_id"::text AS "residenteId",
        i."responsable_id"::text AS "responsableId"
      FROM "evidencias_incidencia" AS e
      INNER JOIN "incidencias" AS i
        ON i."id" = e."incidencia_id"
      WHERE i."id" = ${incidenciaId}::uuid
        AND e."id" = ${evidenciaId}::uuid
      LIMIT 1
    `;
    return evidencia ?? null;
  }

  /**
   * Persiste el reporte, sus evidencias y el estado inicial en una sola
   * transacción; el bloqueo relee la autorización después de escribir archivos.
   */
  async createWithInitialHistory(
    data: CrearIncidenciaPersistencia,
  ): Promise<IncidenciaCreadaEntity> {
    if (data.evidencias.length > 3) {
      throw new CantidadEvidenciasIncidenciaInvalidaError();
    }

    return this.prisma.$transaction(async (tx) => {
      const [usuario] = await tx.$queryRaw<IncidenciaUserAccess[]>`
        SELECT "is_active" AS "isActive", "rol"::text AS "rol"
        FROM "users"
        WHERE "id" = ${data.residenteId}::uuid
        FOR SHARE
      `;

      if (!usuario || !usuario.isActive) {
        throw new UsuarioIncidenciaNoDisponibleError();
      }
      if (usuario.rol !== 'RESIDENTE') {
        throw new RolIncidenciaNoAutorizadoError();
      }

      if (data.lugarTipo === 'UNIDAD') {
        if (!data.unidadId || data.areaId !== null) {
          throw new LugarIncidenciaInvalidoError();
        }

        const unidades = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id"::text AS "id"
          FROM "Unidad"
          WHERE "id" = ${data.unidadId}::uuid
          FOR SHARE
        `;
        if (unidades.length === 0) throw new UnidadIncidenciaInexistenteError();

        const vinculos = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id"::text AS "id"
          FROM "UsuarioUnidad"
          WHERE "unidadId" = ${data.unidadId}::uuid
            AND "userId" = ${data.residenteId}::uuid
          FOR SHARE
        `;
        if (vinculos.length === 0) throw new UnidadIncidenciaAjenaError();
      } else if (data.lugarTipo === 'AREA_COMUN') {
        if (!data.areaId || data.unidadId !== null) {
          throw new LugarIncidenciaInvalidoError();
        }

        const areas = await tx.$queryRaw<Array<{ activa: boolean }>>`
          SELECT "activa" AS "activa"
          FROM "AreaComun"
          WHERE "id" = ${data.areaId}::uuid
          FOR SHARE
        `;
        const area = areas[0];
        if (!area) throw new AreaIncidenciaInexistenteError();
        if (!area.activa) throw new AreaIncidenciaInactivaError();
      } else {
        throw new LugarIncidenciaInvalidoError();
      }

      const id = randomUUID();
      const [incidencia] = await tx.$queryRaw<IncidenciaInsertada[]>`
        INSERT INTO "incidencias" (
          "id", "residente_id", "lugar_tipo", "unidad_id", "area_id",
          "categoria", "descripcion", "prioridad", "estado", "responsable_id",
          "created_at", "updated_at"
        ) VALUES (
          ${id}::uuid,
          ${data.residenteId}::uuid,
          ${data.lugarTipo}::"LugarTipo",
          ${data.unidadId}::uuid,
          ${data.areaId}::uuid,
          ${data.categoria}::"Categoria",
          ${data.descripcion},
          NULL,
          'ABIERTA'::"EstadoIncidencia",
          NULL,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING
          "id"::text AS "id",
          "codigo" AS "codigo",
          "categoria"::text AS "categoria",
          "estado"::text AS "estado",
          "created_at" AS "createdAt"
      `;

      if (!incidencia) {
        throw new Error('La inserción no devolvió la incidencia creada.');
      }

      const evidencias: Array<{ id: string }> = [];
      for (const evidencia of data.evidencias) {
        const evidenciaId = randomUUID();
        const filasInsertadas = await tx.$executeRaw`
          INSERT INTO "evidencias_incidencia" (
            "id", "incidencia_id", "ruta", "mime", "tamano_bytes", "created_at"
          ) VALUES (
            ${evidenciaId}::uuid,
            ${id}::uuid,
            ${evidencia.ruta},
            ${evidencia.mime},
            ${evidencia.tamanoBytes},
            CURRENT_TIMESTAMP
          )
        `;
        if (filasInsertadas !== 1) {
          throw new Error('No se insertó exactamente una evidencia.');
        }
        evidencias.push({ id: evidenciaId });
      }

      const filasHistorial = await tx.$executeRaw`
        INSERT INTO "historial_incidencia" (
          "id", "incidencia_id", "campo", "valor_anterior", "valor_nuevo",
          "actor_id", "created_at"
        ) VALUES (
          ${randomUUID()}::uuid,
          ${id}::uuid,
          'ESTADO'::"CampoHistorial",
          NULL,
          'ABIERTA',
          ${data.residenteId}::uuid,
          CURRENT_TIMESTAMP
        )
      `;
      if (filasHistorial !== 1) {
        throw new Error('No se insertó el historial inicial de la incidencia.');
      }

      return { ...incidencia, evidencias };
    });
  }
}
