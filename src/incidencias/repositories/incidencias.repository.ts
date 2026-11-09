import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@Prisma/services';
import { Prisma } from '@PrismaClient';
import { CampoHistorial } from '@PrismaClient';
import type { Categoria, EstadoIncidencia, Prioridad } from '@PrismaClient';
import type {
  CategoriaIncidencia,
  LugarIncidencia,
} from '../dto/crear-incidencia.dto.js';
import type { ListarIncidenciasDto } from '../dto/listar-incidencias.dto.js';
import type { ListarResponsablesDto } from '../dto/listar-responsables.dto.js';
import type { IncidenciaCreadaEntity } from '../dto/incidencia-creada.dto.js';
import type {
  CandidatoResponsableAsignacion,
  IncidenciaAsignacionActual,
  PlanAsignacionIncidencia,
} from '../services/asignacion-incidencia.rules.js';
import {
  AreaIncidenciaInactivaError,
  AreaIncidenciaInexistenteError,
  CantidadEvidenciasIncidenciaInvalidaError,
  IncidenciaNoEncontradaError,
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

export interface IncidenciaListadoRecord {
  id: string;
  codigo: string;
  lugar: string;
  categoria: Categoria;
  creadaAt: Date;
  prioridad: Prioridad | null;
  responsable: { id: string; nombre: string } | null;
  estado: EstadoIncidencia;
}

interface IncidenciaListadoSqlRow {
  id: string;
  codigo: string;
  lugar: string | null;
  categoria: Categoria;
  creadaAt: Date;
  prioridad: Prioridad | null;
  responsableId: string | null;
  responsableNombre: string | null;
  estado: EstadoIncidencia;
}

export interface IncidenciaAsignacionBloqueada extends IncidenciaAsignacionActual {
  id: string;
  responsableNombre: string | null;
}

export interface ResponsableAsignacionLeido extends CandidatoResponsableAsignacion {
  nombre: string;
}

export interface AsignacionActualizadaRecord {
  id: string;
  prioridad: Prioridad | null;
  responsable: { id: string; nombre: string } | null;
  estado: EstadoIncidencia;
}

interface AsignacionActualizadaSqlRow {
  id: string;
  prioridad: Prioridad | null;
  responsableId: string | null;
  responsableNombre: string | null;
  estado: EstadoIncidencia;
}

export interface SesionAsignacionIncidencia {
  readonly actual: IncidenciaAsignacionBloqueada;
  buscarCandidato(
    responsableId: string,
  ): Promise<ResponsableAsignacionLeido | null>;
  aplicarPlan(
    plan: PlanAsignacionIncidencia,
  ): Promise<AsignacionActualizadaRecord>;
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

  /** Página y total usan el mismo filtro y snapshot de lectura. */
  async listarAdministrativamente(
    query: ListarIncidenciasDto,
    offset: number,
  ): Promise<{ datos: IncidenciaListadoRecord[]; total: number }> {
    const where = this.whereListado(query);

    return this.prisma.$transaction(
      async (tx) => {
        const filas = await tx.$queryRaw<IncidenciaListadoSqlRow[]>(Prisma.sql`
          SELECT
            i."id"::text AS "id",
            i."codigo" AS "codigo",
            COALESCE(u."codigo", a."nombre") AS "lugar",
            i."categoria"::text AS "categoria",
            i."created_at" AS "creadaAt",
            i."prioridad"::text AS "prioridad",
            r."id"::text AS "responsableId",
            r."nombre" AS "responsableNombre",
            i."estado"::text AS "estado"
          FROM "incidencias" AS i
          LEFT JOIN "users" AS r
            ON r."id" = i."responsable_id"
          LEFT JOIN "Unidad" AS u
            ON i."lugar_tipo" = 'UNIDAD'::"LugarTipo"
            AND u."id" = i."unidad_id"
          LEFT JOIN "AreaComun" AS a
            ON i."lugar_tipo" = 'AREA_COMUN'::"LugarTipo"
            AND a."id" = i."area_id"
          ${where}
          ORDER BY
            CASE i."prioridad"::text
              WHEN 'URGENTE' THEN 0
              WHEN 'ALTA' THEN 1
              WHEN 'MEDIA' THEN 2
              WHEN 'BAJA' THEN 3
              ELSE 4
            END ASC,
            i."created_at" ASC,
            i."id" ASC
          LIMIT ${query.tamanoPagina}
          OFFSET ${offset}
        `);

        const [conteo] = await tx.$queryRaw<
          Array<{ total: bigint }>
        >(Prisma.sql`
          SELECT COUNT(*) AS "total"
          FROM "incidencias" AS i
          ${where}
        `);
        if (!conteo) throw new Error('La consulta no devolvió el conteo.');

        const total = Number(conteo.total);
        if (!Number.isSafeInteger(total) || total < 0) {
          throw new Error('El conteo de incidencias excede el entero seguro.');
        }

        const datos = filas.map((fila): IncidenciaListadoRecord => {
          if (fila.lugar === null) {
            throw new Error(
              'La incidencia no tiene una ubicación consistente.',
            );
          }
          if (fila.responsableId !== null && fila.responsableNombre === null) {
            throw new Error(
              'La incidencia tiene un responsable inconsistente.',
            );
          }

          return {
            id: fila.id,
            codigo: fila.codigo,
            lugar: fila.lugar,
            categoria: fila.categoria,
            creadaAt: fila.creadaAt,
            prioridad: fila.prioridad,
            responsable:
              fila.responsableId === null
                ? null
                : {
                    id: fila.responsableId,
                    nombre: fila.responsableNombre as string,
                  },
            estado: fila.estado,
          };
        });

        return { datos, total };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  /** Catálogo paginado y mínimo de usuarios elegibles para asignación. */
  async listarResponsablesAdministrativamente(
    query: ListarResponsablesDto,
    offset: number,
  ): Promise<{ datos: Array<{ id: string; nombre: string }>; total: number }> {
    const where: Prisma.UserWhereInput = {
      isActive: true,
      rol: { in: ['ADMINISTRADOR', 'SEGURIDAD'] },
    };

    const [datos, total] = await this.prisma.$transaction(
      [
        this.prisma.user.findMany({
          where,
          select: { id: true, nombre: true },
          orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
          skip: offset,
          take: query.tamanoPagina,
        }),
        this.prisma.user.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );

    return { datos, total };
  }

  /** Bloquea la incidencia y expone solo operaciones dentro de esa transacción. */
  async conBloqueoAsignacion<T>(
    incidenciaId: string,
    operar: (sesion: SesionAsignacionIncidencia) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const [actual] = await tx.$queryRaw<IncidenciaAsignacionBloqueada[]>`
          SELECT
            i."id"::text AS "id",
            i."prioridad"::text AS "prioridad",
            i."responsable_id"::text AS "responsableId",
            i."estado"::text AS "estado",
            r."nombre" AS "responsableNombre"
          FROM "incidencias" AS i
          LEFT JOIN "users" AS r
            ON r."id" = i."responsable_id"
          WHERE i."id" = ${incidenciaId}::uuid
          FOR UPDATE OF i
        `;
        if (!actual) throw new IncidenciaNoEncontradaError();

        const sesion: SesionAsignacionIncidencia = {
          actual,
          buscarCandidato: async (responsableId) => {
            const [candidato] = await tx.$queryRaw<
              ResponsableAsignacionLeido[]
            >`
              SELECT
                "id"::text AS "id",
                "nombre" AS "nombre",
                "is_active" AS "isActive",
                "rol"::text AS "rol"
              FROM "users"
              WHERE "id" = ${responsableId}::uuid
              FOR SHARE
            `;
            return candidato ?? null;
          },
          aplicarPlan: async (plan) => {
            if (plan.historial.length > 0) {
              if (!plan.updatedAt) {
                throw new Error(
                  'El plan de asignación no incluye updatedAt para sus cambios.',
                );
              }

              const actualizaciones: Prisma.Sql[] = [];
              const cambioPrioridad = plan.historial.find(
                (entrada) => entrada.campo === CampoHistorial.PRIORIDAD,
              );
              const cambioResponsable = plan.historial.find(
                (entrada) => entrada.campo === CampoHistorial.RESPONSABLE,
              );
              const cambioEstado = plan.historial.find(
                (entrada) => entrada.campo === CampoHistorial.ESTADO,
              );

              if (cambioPrioridad) {
                actualizaciones.push(
                  Prisma.sql`"prioridad" = ${cambioPrioridad.valorNuevo}::"Prioridad"`,
                );
              }
              if (cambioResponsable) {
                actualizaciones.push(
                  Prisma.sql`"responsable_id" = ${cambioResponsable.valorNuevo}::uuid`,
                );
              }
              if (cambioEstado) {
                actualizaciones.push(
                  Prisma.sql`"estado" = ${cambioEstado.valorNuevo}::"EstadoIncidencia"`,
                );
              }
              actualizaciones.push(
                Prisma.sql`"updated_at" = ${plan.updatedAt}`,
              );

              const actualizadas = await tx.$executeRaw(Prisma.sql`
                UPDATE "incidencias"
                SET ${Prisma.join(actualizaciones, ', ')}
                WHERE "id" = ${incidenciaId}::uuid
              `);
              if (actualizadas !== 1) {
                throw new Error(
                  'No se actualizó exactamente una incidencia bloqueada.',
                );
              }

              for (const entrada of plan.historial) {
                const insertadas = await tx.$executeRaw(Prisma.sql`
                  INSERT INTO "historial_incidencia" (
                    "id", "incidencia_id", "campo", "valor_anterior",
                    "valor_nuevo", "actor_id", "created_at"
                  ) VALUES (
                    ${randomUUID()}::uuid,
                    ${incidenciaId}::uuid,
                    ${entrada.campo}::"CampoHistorial",
                    ${entrada.valorAnterior},
                    ${entrada.valorNuevo},
                    ${entrada.actorId}::uuid,
                    ${entrada.createdAt}
                  )
                `);
                if (insertadas !== 1) {
                  throw new Error(
                    'No se insertó exactamente una entrada de historial.',
                  );
                }
              }
            } else if (plan.updatedAt !== null) {
              throw new Error(
                'El plan sin cambios no debe actualizar updatedAt.',
              );
            }

            const [resultado] = await tx.$queryRaw<
              AsignacionActualizadaSqlRow[]
            >`
              SELECT
                i."id"::text AS "id",
                i."prioridad"::text AS "prioridad",
                i."estado"::text AS "estado",
                r."id"::text AS "responsableId",
                r."nombre" AS "responsableNombre"
              FROM "incidencias" AS i
              LEFT JOIN "users" AS r
                ON r."id" = i."responsable_id"
              WHERE i."id" = ${incidenciaId}::uuid
            `;
            if (!resultado) {
              throw new Error(
                'La lectura final no devolvió la incidencia actualizada.',
              );
            }
            if (
              resultado.responsableId !== null &&
              resultado.responsableNombre === null
            ) {
              throw new Error(
                'La incidencia tiene un responsable inconsistente.',
              );
            }

            return {
              id: resultado.id,
              prioridad: resultado.prioridad,
              estado: resultado.estado,
              responsable:
                resultado.responsableId === null
                  ? null
                  : {
                      id: resultado.responsableId,
                      nombre: resultado.responsableNombre as string,
                    },
            };
          },
        };

        return operar(sesion);
      },
      { maxWait: 10_000, timeout: 15_000 },
    );
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

  private whereListado(query: ListarIncidenciasDto): Prisma.Sql {
    const condiciones: Prisma.Sql[] = [];
    if (query.estado !== undefined) {
      condiciones.push(
        Prisma.sql`i."estado" = ${query.estado}::"EstadoIncidencia"`,
      );
    }
    if (query.prioridad !== undefined) {
      condiciones.push(
        Prisma.sql`i."prioridad" = ${query.prioridad}::"Prioridad"`,
      );
    }

    return condiciones.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(condiciones, ' AND ')}`
      : Prisma.empty;
  }
}
