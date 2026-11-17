import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl) {
  try {
    const parsed = new URL(testUrl);
    const database = decodeURIComponent(parsed.pathname.split('/').pop() ?? '');
    if (
      !database.endsWith('_test') ||
      !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
    ) {
      throw new Error(
        'TEST_DATABASE_URL debe apuntar a PostgreSQL local y a una base con sufijo _test.',
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('TEST_DATABASE_URL')
    ) {
      throw error;
    }
    throw new Error('TEST_DATABASE_URL debe ser una URL PostgreSQL válida.');
  }
}

const ids = {
  residente: randomUUID(),
  vecino: randomUUID(),
  administrador: randomUUID(),
  responsable: randomUUID(),
  torre: randomUUID(),
  seccion: randomUUID(),
  unidad: randomUUID(),
  incidencia: randomUUID(),
  incidenciaFalloH28: randomUUID(),
  incidenciaDobleInicio: randomUUID(),
  incidenciaDobleResolucion: randomUUID(),
  incidenciaResolucionPrimero: randomUUID(),
  incidenciaInicioPrimero: randomUUID(),
  incidenciaCarreraH10: randomUUID(),
  incidenciaH10AntesH11: randomUUID(),
  incidenciaFechaBloqueada: randomUUID(),
  incidenciaRollback: randomUUID(),
  incidenciaFalloAntesUpdate: randomUUID(),
  evidenciaResuelta: randomUUID(),
  evidenciaFalloH28: randomUUID(),
};
const prefijo = `h11-${randomUUID().slice(0, 8)}`;
const claveEvento = `INCIDENCIA_RESUELTA:${ids.incidencia}`;
const claveEventoFalloH28 = `INCIDENCIA_RESUELTA:${ids.incidenciaFalloH28}`;
const idsIncidencia = [
  ids.incidencia,
  ids.incidenciaFalloH28,
  ids.incidenciaDobleInicio,
  ids.incidenciaDobleResolucion,
  ids.incidenciaResolucionPrimero,
  ids.incidenciaInicioPrimero,
  ids.incidenciaCarreraH10,
  ids.incidenciaH10AntesH11,
  ids.incidenciaFechaBloqueada,
  ids.incidenciaRollback,
  ids.incidenciaFalloAntesUpdate,
];
const claveEventoDe = (incidenciaId: string) =>
  `INCIDENCIA_RESUELTA:${incidenciaId}`;

type SqlClient = {
  $executeRaw: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<number>;
  $executeRawUnsafe: (query: string) => Promise<number>;
  $queryRaw: <T>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>;
  $transaction: <T>(operation: (tx: SqlClient) => Promise<T>) => Promise<T>;
};

describe.skipIf(!testUrl)(
  'H11 → H28 · PATCH HTTP, historial y bandeja H27 con PostgreSQL local',
  () => {
    let app: INestApplication | undefined;
    let db: SqlClient | undefined;
    let uploadsDir: string | undefined;
    let bearerAdmin = '';
    let bearerResidente = '';
    let bearerVecino = '';
    let bearerResponsable = '';
    let triggerRollback:
      { trigger: string; funcion: string; tabla: string } | undefined;

    const database = (): SqlClient => {
      if (!db) throw new Error('La base aislada H11 no está preparada.');
      return db;
    };
    const http = () => {
      if (!app) throw new Error('La aplicación integrada H11 no está lista.');
      return request(app.getHttpServer());
    };
    const esperarConsultasBloqueadas = async (
      patron: string,
      cantidad: number,
    ) => {
      const limite = Date.now() + 10_000;
      while (Date.now() < limite) {
        const [fila] = await database().$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(*) AS "total"
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND wait_event_type = 'Lock'
            AND query ILIKE ${`%${patron}%`}
        `;
        if (Number(fila?.total ?? 0) >= cantidad) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error(`No se observaron ${cantidad} esperas por ${patron}.`);
    };
    const bloquearIncidencia = (incidenciaId: string) => {
      let liberar!: () => void;
      let senalarBloqueo!: () => void;
      const barrera = new Promise<void>((resolve) => {
        liberar = resolve;
      });
      const bloqueoListo = new Promise<void>((resolve) => {
        senalarBloqueo = resolve;
      });
      const finalizado = database().$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "incidencias"
          WHERE "id" = ${incidenciaId}::uuid
          FOR UPDATE
        `;
        senalarBloqueo();
        await barrera;
      });
      return { bloqueoListo, liberar, finalizado };
    };
    const contarTransicionEstado = async (
      incidenciaId: string,
      anterior: string,
      nuevo: string,
    ) => {
      const [fila] = await database().$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) AS "total"
        FROM "historial_incidencia"
        WHERE "incidencia_id" = ${incidenciaId}::uuid
          AND "campo" = 'ESTADO'::"CampoHistorial"
          AND "valor_anterior" = ${anterior}
          AND "valor_nuevo" = ${nuevo}
      `;
      return Number(fila?.total ?? 0);
    };
    const contarAvisosIncidencia = async (incidenciaId: string) => {
      const [fila] = await database().$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) AS "total"
        FROM "notificaciones"
        WHERE "clave_evento" = ${claveEventoDe(incidenciaId)}
      `;
      return Number(fila?.total ?? 0);
    };
    const insertarUsuario = async (
      id: string,
      rol: 'RESIDENTE' | 'ADMINISTRADOR' | 'SEGURIDAD',
      nombre: string,
    ) => {
      await database().$executeRaw`
        INSERT INTO "users" (
          "id", "email", "password_hash", "is_active", "rol", "nombre", "updated_at"
        ) VALUES (
          ${id}::uuid,
          ${`${prefijo}-${nombre.replaceAll(' ', '-')}@condominio.test`},
          'hash-h11-test', true, ${rol}::"Rol", ${nombre}, CURRENT_TIMESTAMP
        )
      `;
    };

    beforeAll(async () => {
      if (!testUrl) throw new Error('TEST_DATABASE_URL es obligatorio.');
      uploadsDir = await mkdtemp(join(tmpdir(), 'h11-e2e-uploads-'));
      const directorioEvidencias = join(uploadsDir, 'incidencias');
      await mkdir(directorioEvidencias, { recursive: true });
      for (const evidenciaId of [
        ids.evidenciaResuelta,
        ids.evidenciaFalloH28,
      ]) {
        await writeFile(
          join(directorioEvidencias, `${evidenciaId}.jpg`),
          Buffer.from('h11-evidence-fixture'),
        );
      }
      process.env.DATABASE_URL = testUrl;
      process.env.JWT_SECRET = 'clave-aislada-exclusiva-pruebas-h11-2026';
      process.env.NODE_ENV = 'test';
      process.env.UPLOADS_DIR = uploadsDir;

      const { AppModule } = await import('../dist/app.module.js');
      const { PrismaService } =
        await import('../dist/prisma/services/prisma.service.js');
      const testingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = testingModule.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.listen(0, '127.0.0.1');
      db = app.get(PrismaService) as SqlClient;

      await insertarUsuario(ids.residente, 'RESIDENTE', 'Autor H11');
      await insertarUsuario(ids.vecino, 'RESIDENTE', 'Vecino H11');
      await insertarUsuario(
        ids.administrador,
        'ADMINISTRADOR',
        'Administrador H11',
      );
      await insertarUsuario(ids.responsable, 'SEGURIDAD', 'Responsable H11');
      await database().$executeRaw`
        INSERT INTO "Torre" ("id", "nombre")
        VALUES (${ids.torre}::uuid, ${`${prefijo}-torre`})
      `;
      await database().$executeRaw`
        INSERT INTO "Seccion" ("id", "nombre", "torreId")
        VALUES (${ids.seccion}::uuid, 'H11', ${ids.torre}::uuid)
      `;
      await database().$executeRaw`
        INSERT INTO "Unidad" (
          "id", "codigo", "torreId", "seccionId", "cuotaMensual"
        ) VALUES (
          ${ids.unidad}::uuid, ${`${prefijo}-unidad`},
          ${ids.torre}::uuid, ${ids.seccion}::uuid, 50.00
        )
      `;
      await database().$executeRaw`
        INSERT INTO "UsuarioUnidad" ("id", "userId", "unidadId") VALUES
          (${randomUUID()}::uuid, ${ids.residente}::uuid, ${ids.unidad}::uuid),
          (${randomUUID()}::uuid, ${ids.vecino}::uuid, ${ids.unidad}::uuid)
      `;
      const insertarIncidenciaEnProceso = async (
        incidenciaId: string,
        descripcion: string,
      ) => {
        await database().$executeRaw`
          INSERT INTO "incidencias" (
            "id", "residente_id", "lugar_tipo", "unidad_id", "categoria",
            "descripcion", "prioridad", "estado", "responsable_id", "created_at", "updated_at"
          ) VALUES (
            ${incidenciaId}::uuid, ${ids.residente}::uuid, 'UNIDAD'::"LugarTipo",
            ${ids.unidad}::uuid, 'OTRO'::"Categoria", ${descripcion},
            'MEDIA'::"Prioridad", 'EN_PROCESO'::"EstadoIncidencia",
            ${ids.responsable}::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;
        await database().$executeRaw`
          INSERT INTO "historial_incidencia" (
            "id", "incidencia_id", "campo", "valor_anterior", "valor_nuevo", "actor_id", "created_at"
          ) VALUES
            (${randomUUID()}::uuid, ${incidenciaId}::uuid, 'ESTADO'::"CampoHistorial", NULL, 'ABIERTA', ${ids.residente}::uuid, CURRENT_TIMESTAMP),
            (${randomUUID()}::uuid, ${incidenciaId}::uuid, 'ESTADO'::"CampoHistorial", 'ABIERTA', 'ASIGNADA', ${ids.administrador}::uuid, CURRENT_TIMESTAMP),
            (${randomUUID()}::uuid, ${incidenciaId}::uuid, 'ESTADO'::"CampoHistorial", 'ASIGNADA', 'EN_PROCESO', ${ids.administrador}::uuid, CURRENT_TIMESTAMP)
        `;
      };
      const insertarIncidenciaAsignada = async (
        incidenciaId: string,
        descripcion: string,
      ) => {
        await database().$executeRaw`
          INSERT INTO "incidencias" (
            "id", "residente_id", "lugar_tipo", "unidad_id", "categoria",
            "descripcion", "prioridad", "estado", "responsable_id", "created_at", "updated_at"
          ) VALUES (
            ${incidenciaId}::uuid, ${ids.residente}::uuid, 'UNIDAD'::"LugarTipo",
            ${ids.unidad}::uuid, 'OTRO'::"Categoria", ${descripcion},
            'MEDIA'::"Prioridad", 'ASIGNADA'::"EstadoIncidencia",
            ${ids.responsable}::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;
        await database().$executeRaw`
          INSERT INTO "historial_incidencia" (
            "id", "incidencia_id", "campo", "valor_anterior", "valor_nuevo", "actor_id", "created_at"
          ) VALUES
            (${randomUUID()}::uuid, ${incidenciaId}::uuid, 'ESTADO'::"CampoHistorial", NULL, 'ABIERTA', ${ids.residente}::uuid, CURRENT_TIMESTAMP),
            (${randomUUID()}::uuid, ${incidenciaId}::uuid, 'ESTADO'::"CampoHistorial", 'ABIERTA', 'ASIGNADA', ${ids.administrador}::uuid, CURRENT_TIMESTAMP)
        `;
      };
      await insertarIncidenciaEnProceso(
        ids.incidencia,
        'Prueba integración H11 H28',
      );
      await insertarIncidenciaEnProceso(
        ids.incidenciaFalloH28,
        'Prueba fallo postcommit H11 H28',
      );
      for (const incidenciaId of [
        ids.incidenciaDobleResolucion,
        ids.incidenciaCarreraH10,
        ids.incidenciaH10AntesH11,
        ids.incidenciaFechaBloqueada,
        ids.incidenciaRollback,
        ids.incidenciaFalloAntesUpdate,
      ]) {
        await insertarIncidenciaEnProceso(
          incidenciaId,
          'Prueba H11 EN_PROCESO',
        );
      }
      for (const incidenciaId of [
        ids.incidenciaDobleInicio,
        ids.incidenciaResolucionPrimero,
        ids.incidenciaInicioPrimero,
      ]) {
        await insertarIncidenciaAsignada(incidenciaId, 'Prueba H11 ASIGNADA');
      }
      for (const [incidenciaId, evidenciaId] of [
        [ids.incidencia, ids.evidenciaResuelta],
        [ids.incidenciaFalloH28, ids.evidenciaFalloH28],
      ]) {
        await database().$executeRaw`
          INSERT INTO "evidencias_incidencia" (
            "id", "incidencia_id", "ruta", "mime", "tamano_bytes", "created_at"
          ) VALUES (
            ${evidenciaId}::uuid, ${incidenciaId}::uuid,
            ${`${evidenciaId}.jpg`}, 'image/jpeg', 128, CURRENT_TIMESTAMP
          )
        `;
      }

      const jwt = app.get(JwtService);
      const token = (id: string, nombre: string) =>
        `Bearer ${jwt.sign({
          sub: id,
          email: `${prefijo}-${nombre}@condominio.test`,
        })}`;
      bearerAdmin = token(ids.administrador, 'Administrador-H11');
      bearerResidente = token(ids.residente, 'Autor-H11');
      bearerVecino = token(ids.vecino, 'Vecino-H11');
      bearerResponsable = token(ids.responsable, 'Responsable-H11');
    }, 60_000);

    afterAll(async () => {
      if (db) {
        if (triggerRollback) {
          await database().$executeRawUnsafe(
            `DROP TRIGGER IF EXISTS "${triggerRollback.trigger}" ON "${triggerRollback.tabla}"`,
          );
          await database().$executeRawUnsafe(
            `DROP FUNCTION IF EXISTS public."${triggerRollback.funcion}"()`,
          );
        }
        for (const incidenciaId of idsIncidencia) {
          await database().$executeRaw`
            DELETE FROM "notificaciones"
            WHERE "clave_evento" = ${claveEventoDe(incidenciaId)}
          `;
          await database().$executeRaw`
            DELETE FROM "historial_incidencia"
            WHERE "incidencia_id" = ${incidenciaId}::uuid
          `;
          await database().$executeRaw`
            DELETE FROM "evidencias_incidencia"
            WHERE "incidencia_id" = ${incidenciaId}::uuid
          `;
          await database().$executeRaw`
            DELETE FROM "incidencias" WHERE "id" = ${incidenciaId}::uuid
          `;
        }
        await database().$executeRaw`
          DELETE FROM "UsuarioUnidad" WHERE "unidadId" = ${ids.unidad}::uuid
        `;
        await database().$executeRaw`
          DELETE FROM "Unidad" WHERE "id" = ${ids.unidad}::uuid
        `;
        await database().$executeRaw`
          DELETE FROM "Seccion" WHERE "id" = ${ids.seccion}::uuid
        `;
        await database().$executeRaw`
          DELETE FROM "Torre" WHERE "id" = ${ids.torre}::uuid
        `;
        for (const id of [
          ids.residente,
          ids.vecino,
          ids.administrador,
          ids.responsable,
        ]) {
          await database()
            .$executeRaw`DELETE FROM "users" WHERE "id" = ${id}::uuid`;
        }
      }
      await app?.close();
      if (uploadsDir) await rm(uploadsDir, { recursive: true, force: true });
    }, 30_000);

    it('guarda RESUELTA e historial antes de crear un aviso H28 solo para el autor', async () => {
      const respuesta = await http()
        .patch(`/api/v1/incidencias/${ids.incidencia}/estado`)
        .set('Authorization', bearerAdmin)
        .send({ estado: 'RESUELTA' })
        .expect(200);

      expect(respuesta.body).toMatchObject({
        id: ids.incidencia,
        estado: 'RESUELTA',
      });
      expect(Number.isNaN(Date.parse(respuesta.body.actualizadaAt))).toBe(
        false,
      );

      const [incidencia] = await database().$queryRaw<
        Array<{
          estado: string;
          updatedAt: Date;
          createdAt: Date;
          codigo: string;
          prioridad: string | null;
          responsableId: string | null;
        }>
      >`
        SELECT
          "estado"::text AS "estado",
          "updated_at" AS "updatedAt",
          "created_at" AS "createdAt",
          "codigo",
          "prioridad"::text AS "prioridad",
          "responsable_id"::text AS "responsableId"
        FROM "incidencias" WHERE "id" = ${ids.incidencia}::uuid
      `;
      expect(incidencia).toMatchObject({ estado: 'RESUELTA' });
      expect(incidencia?.updatedAt.toISOString()).toBe(
        respuesta.body.actualizadaAt,
      );
      expect(incidencia).toMatchObject({
        prioridad: 'MEDIA',
        responsableId: ids.responsable,
      });

      const listadoH10 = await http()
        .get('/api/v1/incidencias')
        .set('Authorization', bearerAdmin)
        .query({ estado: 'RESUELTA', tamanoPagina: 50 })
        .expect(200);
      const filaEnListado = listadoH10.body.datos.find(
        (fila: { id: string }) => fila.id === ids.incidencia,
      );
      expect(filaEnListado).toMatchObject({
        id: ids.incidencia,
        codigo: incidencia?.codigo,
        estado: 'RESUELTA',
        prioridad: 'MEDIA',
        responsable: { id: ids.responsable },
      });
      expect(new Date(filaEnListado.creadaAt).toISOString()).toBe(
        incidencia?.createdAt.toISOString(),
      );

      const historial = await database().$queryRaw<
        Array<{
          valorAnterior: string;
          valorNuevo: string;
          actorId: string;
          createdAt: Date;
        }>
      >`
        SELECT
          "valor_anterior" AS "valorAnterior",
          "valor_nuevo" AS "valorNuevo",
          "actor_id"::text AS "actorId",
          "created_at" AS "createdAt"
        FROM "historial_incidencia"
        WHERE "incidencia_id" = ${ids.incidencia}::uuid
          AND "campo" = 'ESTADO'::"CampoHistorial"
          AND "valor_anterior" = 'EN_PROCESO'
          AND "valor_nuevo" = 'RESUELTA'
      `;
      expect(historial).toHaveLength(1);
      expect(historial[0]).toMatchObject({
        valorAnterior: 'EN_PROCESO',
        valorNuevo: 'RESUELTA',
        actorId: ids.administrador,
      });
      expect(historial[0]?.createdAt.toISOString()).toBe(
        respuesta.body.actualizadaAt,
      );

      const avisos = await database().$queryRaw<
        Array<{
          userId: string;
          tipoEvento: string;
          moduloOrigen: string;
          titulo: string;
          mensaje: string;
          referenciaId: string;
        }>
      >`
        SELECT
          "user_id"::text AS "userId",
          "tipo_evento"::text AS "tipoEvento",
          "modulo_origen"::text AS "moduloOrigen",
          "titulo",
          "mensaje",
          "referencia_id"::text AS "referenciaId"
        FROM "notificaciones"
        WHERE "clave_evento" = ${claveEvento}
      `;
      expect(avisos).toEqual([
        {
          userId: ids.residente,
          tipoEvento: 'INCIDENCIA_RESUELTA',
          moduloOrigen: 'INCIDENCIAS',
          titulo: 'Tu incidencia fue resuelta',
          mensaje: `Tu incidencia ${incidencia?.codigo} fue resuelta.`,
          referenciaId: ids.incidencia,
        },
      ]);

      if (!app) throw new Error('La aplicación integrada H11 no está lista.');
      const { NotificacionesService } =
        await import('../dist/notificaciones/services/notificaciones.service.js');
      await expect(
        app.get(NotificacionesService).crear({
          destinatario: { tipo: 'USUARIO', id: ids.residente },
          tipoEvento: 'INCIDENCIA_RESUELTA',
          moduloOrigen: 'INCIDENCIAS',
          titulo: 'Tu incidencia fue resuelta',
          mensaje: `Tu incidencia ${incidencia?.codigo} fue resuelta.`,
          referenciaId: ids.incidencia,
          claveEvento,
        }),
      ).resolves.toEqual({ creadas: 0 });

      const bandejaAutor = await http()
        .get('/api/v1/notificaciones/mias?moduloOrigen=INCIDENCIAS')
        .set('Authorization', bearerResidente)
        .expect(200);
      expect(bandejaAutor.body).toMatchObject({
        total: 1,
        noLeidas: 1,
        datos: [
          expect.objectContaining({
            tipoEvento: 'INCIDENCIA_RESUELTA',
            moduloOrigen: 'INCIDENCIAS',
            titulo: 'Tu incidencia fue resuelta',
            referenciaId: ids.incidencia,
            estado: 'NO_LEIDA',
          }),
        ],
      });

      const bandejaVecino = await http()
        .get('/api/v1/notificaciones/mias?moduloOrigen=INCIDENCIAS')
        .set('Authorization', bearerVecino)
        .expect(200);
      expect(bandejaVecino.body).toMatchObject({ datos: [], total: 0 });

      const urlEvidencia =
        `/api/v1/incidencias/${ids.incidencia}/evidencias/` +
        ids.evidenciaResuelta;
      for (const credencial of [
        bearerResidente,
        bearerAdmin,
        bearerResponsable,
      ]) {
        await http()
          .get(urlEvidencia)
          .set('Authorization', credencial)
          .expect(200);
      }
      await http()
        .get(urlEvidencia)
        .set('Authorization', bearerVecino)
        .expect(404);

      await http()
        .patch(`/api/v1/incidencias/${ids.incidencia}/estado`)
        .set('Authorization', bearerAdmin)
        .send({ estado: 'RESUELTA' })
        .expect(409);
      expect(
        await database().$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(*) AS "total" FROM "historial_incidencia"
          WHERE "incidencia_id" = ${ids.incidencia}::uuid
            AND "campo" = 'ESTADO'::"CampoHistorial"
            AND "valor_anterior" = 'EN_PROCESO'
            AND "valor_nuevo" = 'RESUELTA'
        `,
      ).toEqual([{ total: 1n }]);
      expect(
        await database().$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(*) AS "total" FROM "notificaciones"
          WHERE "clave_evento" = ${claveEvento}
        `,
      ).toEqual([{ total: 1n }]);
    });

    it('serializa dos inicios concurrentes desde ASIGNADA', async () => {
      const bloqueo = bloquearIncidencia(ids.incidenciaDobleInicio);
      await bloqueo.bloqueoListo;
      const respuestasPromise = Promise.all(
        [1, 2].map(() =>
          http()
            .patch(`/api/v1/incidencias/${ids.incidenciaDobleInicio}/estado`)
            .set('Authorization', bearerAdmin)
            .send({ estado: 'EN_PROCESO' })
            .then((respuesta) => respuesta.status),
        ),
      );
      try {
        await esperarConsultasBloqueadas('FOR UPDATE', 2);
      } finally {
        bloqueo.liberar();
      }
      await bloqueo.finalizado;
      const estadosHttp = (await respuestasPromise).sort((a, b) => a - b);
      expect(estadosHttp).toEqual([200, 409]);
      expect(
        await contarTransicionEstado(
          ids.incidenciaDobleInicio,
          'ASIGNADA',
          'EN_PROCESO',
        ),
      ).toBe(1);
      expect(await contarAvisosIncidencia(ids.incidenciaDobleInicio)).toBe(0);
    }, 30_000);

    it('serializa dos resoluciones concurrentes con un solo historial y aviso', async () => {
      const bloqueo = bloquearIncidencia(ids.incidenciaDobleResolucion);
      await bloqueo.bloqueoListo;
      const respuestasPromise = Promise.all(
        [1, 2].map(() =>
          http()
            .patch(
              `/api/v1/incidencias/${ids.incidenciaDobleResolucion}/estado`,
            )
            .set('Authorization', bearerAdmin)
            .send({ estado: 'RESUELTA' })
            .then((respuesta) => respuesta.status),
        ),
      );
      try {
        await esperarConsultasBloqueadas('FOR UPDATE', 2);
      } finally {
        bloqueo.liberar();
      }
      await bloqueo.finalizado;
      const estadosHttp = (await respuestasPromise).sort((a, b) => a - b);
      expect(estadosHttp).toEqual([200, 409]);
      expect(
        await contarTransicionEstado(
          ids.incidenciaDobleResolucion,
          'EN_PROCESO',
          'RESUELTA',
        ),
      ).toBe(1);
      const avisos = await database().$queryRaw<Array<{ userId: string }>>`
        SELECT "user_id"::text AS "userId"
        FROM "notificaciones"
        WHERE "clave_evento" = ${claveEventoDe(ids.incidenciaDobleResolucion)}
      `;
      expect(avisos).toEqual([{ userId: ids.residente }]);
    }, 30_000);

    it('si RESUELTA llega primero desde ASIGNADA, solo inicia el estado permitido', async () => {
      const bloqueo = bloquearIncidencia(ids.incidenciaResolucionPrimero);
      await bloqueo.bloqueoListo;
      const resolver = http()
        .patch(`/api/v1/incidencias/${ids.incidenciaResolucionPrimero}/estado`)
        .set('Authorization', bearerAdmin)
        .send({ estado: 'RESUELTA' })
        .then((respuesta) => respuesta.status);
      let iniciar: Promise<number> = Promise.resolve(0);
      try {
        await esperarConsultasBloqueadas('FOR UPDATE', 1);
        iniciar = http()
          .patch(
            `/api/v1/incidencias/${ids.incidenciaResolucionPrimero}/estado`,
          )
          .set('Authorization', bearerAdmin)
          .send({ estado: 'EN_PROCESO' })
          .then((respuesta) => respuesta.status);
        await esperarConsultasBloqueadas('FOR UPDATE', 2);
      } finally {
        bloqueo.liberar();
      }
      await bloqueo.finalizado;
      expect(await resolver).toBe(409);
      expect(await iniciar).toBe(200);
      expect(
        await contarTransicionEstado(
          ids.incidenciaResolucionPrimero,
          'ASIGNADA',
          'EN_PROCESO',
        ),
      ).toBe(1);
      expect(
        await contarTransicionEstado(
          ids.incidenciaResolucionPrimero,
          'EN_PROCESO',
          'RESUELTA',
        ),
      ).toBe(0);
      expect(
        await contarAvisosIncidencia(ids.incidenciaResolucionPrimero),
      ).toBe(0);
    }, 30_000);

    it('si EN_PROCESO llega primero, resuelve después y genera un aviso', async () => {
      const bloqueo = bloquearIncidencia(ids.incidenciaInicioPrimero);
      await bloqueo.bloqueoListo;
      const iniciar = http()
        .patch(`/api/v1/incidencias/${ids.incidenciaInicioPrimero}/estado`)
        .set('Authorization', bearerAdmin)
        .send({ estado: 'EN_PROCESO' })
        .then((respuesta) => respuesta.status);
      let resolver: Promise<number> = Promise.resolve(0);
      try {
        await esperarConsultasBloqueadas('FOR UPDATE', 1);
        resolver = http()
          .patch(`/api/v1/incidencias/${ids.incidenciaInicioPrimero}/estado`)
          .set('Authorization', bearerAdmin)
          .send({ estado: 'RESUELTA' })
          .then((respuesta) => respuesta.status);
        await esperarConsultasBloqueadas('FOR UPDATE', 2);
      } finally {
        bloqueo.liberar();
      }
      await bloqueo.finalizado;
      expect(await iniciar).toBe(200);
      expect(await resolver).toBe(200);
      expect(
        await contarTransicionEstado(
          ids.incidenciaInicioPrimero,
          'ASIGNADA',
          'EN_PROCESO',
        ),
      ).toBe(1);
      expect(
        await contarTransicionEstado(
          ids.incidenciaInicioPrimero,
          'EN_PROCESO',
          'RESUELTA',
        ),
      ).toBe(1);
      expect(await contarAvisosIncidencia(ids.incidenciaInicioPrimero)).toBe(1);
    }, 30_000);

    it('rechaza H10 que espera detrás de una resolución H11 confirmada', async () => {
      const bloqueo = bloquearIncidencia(ids.incidenciaCarreraH10);
      await bloqueo.bloqueoListo;
      const resolver = http()
        .patch(`/api/v1/incidencias/${ids.incidenciaCarreraH10}/estado`)
        .set('Authorization', bearerAdmin)
        .send({ estado: 'RESUELTA' })
        .then((respuesta) => respuesta.status);
      let priorizar: Promise<number> = Promise.resolve(0);
      try {
        await esperarConsultasBloqueadas('FOR UPDATE', 1);
        priorizar = http()
          .patch(`/api/v1/incidencias/${ids.incidenciaCarreraH10}/asignacion`)
          .set('Authorization', bearerAdmin)
          .send({ prioridad: 'ALTA' })
          .then((respuesta) => respuesta.status);
        await esperarConsultasBloqueadas('FOR UPDATE', 2);
      } finally {
        bloqueo.liberar();
      }
      await bloqueo.finalizado;
      expect(await resolver).toBe(200);
      expect(await priorizar).toBe(409);
      const [incidencia] = await database().$queryRaw<
        Array<{ estado: string; prioridad: string; responsableId: string }>
      >`
        SELECT
          "estado"::text AS "estado",
          "prioridad"::text AS "prioridad",
          "responsable_id"::text AS "responsableId"
        FROM "incidencias"
        WHERE "id" = ${ids.incidenciaCarreraH10}::uuid
      `;
      expect(incidencia).toEqual({
        estado: 'RESUELTA',
        prioridad: 'MEDIA',
        responsableId: ids.responsable,
      });
      expect(
        await contarTransicionEstado(
          ids.incidenciaCarreraH10,
          'EN_PROCESO',
          'RESUELTA',
        ),
      ).toBe(1);
      expect(await contarAvisosIncidencia(ids.incidenciaCarreraH10)).toBe(1);
    }, 30_000);

    it('conserva una prioridad H10 confirmada antes de resolver con H11', async () => {
      await http()
        .patch(`/api/v1/incidencias/${ids.incidenciaH10AntesH11}/asignacion`)
        .set('Authorization', bearerAdmin)
        .send({ prioridad: 'ALTA' })
        .expect(200);
      await http()
        .patch(`/api/v1/incidencias/${ids.incidenciaH10AntesH11}/estado`)
        .set('Authorization', bearerAdmin)
        .send({ estado: 'RESUELTA' })
        .expect(200);
      const [incidencia] = await database().$queryRaw<
        Array<{ estado: string; prioridad: string; responsableId: string }>
      >`
        SELECT
          "estado"::text AS "estado",
          "prioridad"::text AS "prioridad",
          "responsable_id"::text AS "responsableId"
        FROM "incidencias"
        WHERE "id" = ${ids.incidenciaH10AntesH11}::uuid
      `;
      expect(incidencia).toEqual({
        estado: 'RESUELTA',
        prioridad: 'ALTA',
        responsableId: ids.responsable,
      });
      expect(
        await contarTransicionEstado(
          ids.incidenciaH10AntesH11,
          'EN_PROCESO',
          'RESUELTA',
        ),
      ).toBe(1);
    }, 30_000);

    it('obtiene la fecha de transición después de esperar el bloqueo de fila', async () => {
      const bloqueo = bloquearIncidencia(ids.incidenciaFechaBloqueada);
      await bloqueo.bloqueoListo;
      const respuestaPromise = http()
        .patch(`/api/v1/incidencias/${ids.incidenciaFechaBloqueada}/estado`)
        .set('Authorization', bearerAdmin)
        .send({ estado: 'RESUELTA' })
        .then((respuesta) => respuesta);
      let fechaLiberacion: Date | undefined;
      try {
        await esperarConsultasBloqueadas('FOR UPDATE', 1);
        const [reloj] = await database().$queryRaw<Array<{ ahora: Date }>>`
          SELECT clock_timestamp()::timestamptz(3) AS "ahora"
        `;
        fechaLiberacion = reloj?.ahora;
      } finally {
        bloqueo.liberar();
      }
      await bloqueo.finalizado;
      const respuesta = await respuestaPromise;
      expect(respuesta.status).toBe(200);
      if (!fechaLiberacion)
        throw new Error('No se obtuvo la fecha de liberación del bloqueo.');
      const fechaRespuesta = new Date(respuesta.body.actualizadaAt);
      expect(fechaRespuesta.getTime()).toBeGreaterThanOrEqual(
        fechaLiberacion.getTime(),
      );
      const [incidencia] = await database().$queryRaw<
        Array<{ updatedAt: Date }>
      >`
        SELECT "updated_at" AS "updatedAt"
        FROM "incidencias"
        WHERE "id" = ${ids.incidenciaFechaBloqueada}::uuid
      `;
      expect(incidencia?.updatedAt.toISOString()).toBe(
        fechaRespuesta.toISOString(),
      );
      expect(
        await contarTransicionEstado(
          ids.incidenciaFechaBloqueada,
          'EN_PROCESO',
          'RESUELTA',
        ),
      ).toBe(1);
    }, 30_000);

    it('revierte el estado en PostgreSQL si falla la inserción de historial', async () => {
      const sufijo = randomUUID().replaceAll('-', '');
      triggerRollback = {
        trigger: `h11_rollback_${sufijo}`,
        funcion: `h11_rollback_${sufijo}_fn`,
        tabla: 'historial_incidencia',
      };
      await database().$executeRawUnsafe(`
        CREATE FUNCTION public."${triggerRollback.funcion}"() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW."incidencia_id" = '${ids.incidenciaRollback}'::uuid
             AND NEW."campo" = 'ESTADO'::"CampoHistorial" THEN
            RAISE EXCEPTION 'h11 history insert forced rollback';
          END IF;
          RETURN NEW;
        END;
        $$
      `);
      await database().$executeRawUnsafe(`
        CREATE TRIGGER "${triggerRollback.trigger}"
        BEFORE INSERT ON "historial_incidencia"
        FOR EACH ROW EXECUTE FUNCTION public."${triggerRollback.funcion}"()
      `);
      try {
        const [antes] = await database().$queryRaw<
          Array<{ estado: string; updatedAt: Date }>
        >`
          SELECT "estado"::text AS "estado", "updated_at" AS "updatedAt"
          FROM "incidencias"
          WHERE "id" = ${ids.incidenciaRollback}::uuid
        `;
        await http()
          .patch(`/api/v1/incidencias/${ids.incidenciaRollback}/estado`)
          .set('Authorization', bearerAdmin)
          .send({ estado: 'RESUELTA' })
          .expect(500);
        const [despues] = await database().$queryRaw<
          Array<{ estado: string; updatedAt: Date }>
        >`
          SELECT "estado"::text AS "estado", "updated_at" AS "updatedAt"
          FROM "incidencias"
          WHERE "id" = ${ids.incidenciaRollback}::uuid
        `;
        expect(despues).toEqual(antes);
        expect(antes?.estado).toBe('EN_PROCESO');
        expect(
          await contarTransicionEstado(
            ids.incidenciaRollback,
            'EN_PROCESO',
            'RESUELTA',
          ),
        ).toBe(0);
        expect(await contarAvisosIncidencia(ids.incidenciaRollback)).toBe(0);
      } finally {
        await database().$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${triggerRollback.trigger}" ON "${triggerRollback.tabla}"`,
        );
        await database().$executeRawUnsafe(
          `DROP FUNCTION IF EXISTS public."${triggerRollback.funcion}"()`,
        );
        triggerRollback = undefined;
      }
    }, 30_000);

    it('conserva los datos si PostgreSQL falla antes del UPDATE de estado', async () => {
      const sufijo = randomUUID().replaceAll('-', '');
      triggerRollback = {
        trigger: `h11_update_rollback_${sufijo}`,
        funcion: `h11_update_rollback_${sufijo}_fn`,
        tabla: 'incidencias',
      };
      await database().$executeRawUnsafe(`
        CREATE FUNCTION public."${triggerRollback.funcion}"() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW."id" = '${ids.incidenciaFalloAntesUpdate}'::uuid THEN
            RAISE EXCEPTION 'h11 update forced rollback';
          END IF;
          RETURN NEW;
        END;
        $$
      `);
      await database().$executeRawUnsafe(`
        CREATE TRIGGER "${triggerRollback.trigger}"
        BEFORE UPDATE ON "incidencias"
        FOR EACH ROW EXECUTE FUNCTION public."${triggerRollback.funcion}"()
      `);
      try {
        const [antes] = await database().$queryRaw<
          Array<{ estado: string; updatedAt: Date }>
        >`
          SELECT "estado"::text AS "estado", "updated_at" AS "updatedAt"
          FROM "incidencias"
          WHERE "id" = ${ids.incidenciaFalloAntesUpdate}::uuid
        `;
        await http()
          .patch(`/api/v1/incidencias/${ids.incidenciaFalloAntesUpdate}/estado`)
          .set('Authorization', bearerAdmin)
          .send({ estado: 'RESUELTA' })
          .expect(500);
        const [despues] = await database().$queryRaw<
          Array<{ estado: string; updatedAt: Date }>
        >`
          SELECT "estado"::text AS "estado", "updated_at" AS "updatedAt"
          FROM "incidencias"
          WHERE "id" = ${ids.incidenciaFalloAntesUpdate}::uuid
        `;
        expect(despues).toEqual(antes);
        expect(antes?.estado).toBe('EN_PROCESO');
        expect(
          await contarTransicionEstado(
            ids.incidenciaFalloAntesUpdate,
            'EN_PROCESO',
            'RESUELTA',
          ),
        ).toBe(0);
        expect(
          await contarAvisosIncidencia(ids.incidenciaFalloAntesUpdate),
        ).toBe(0);
      } finally {
        await database().$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${triggerRollback.trigger}" ON "${triggerRollback.tabla}"`,
        );
        await database().$executeRawUnsafe(
          `DROP FUNCTION IF EXISTS public."${triggerRollback.funcion}"()`,
        );
        triggerRollback = undefined;
      }
    }, 30_000);

    it('si H28 responde con error, devuelve 500 genérico y conserva resolución, historial y evidencias', async () => {
      if (!app) throw new Error('La aplicación integrada H11 no está lista.');
      const { NotificacionesService } =
        await import('../dist/notificaciones/services/notificaciones.service.js');
      const servicioH28 = app.get(NotificacionesService);
      const errorInternoH28 = new BadRequestException({
        message: 'titulo generado inválido',
        campo: 'titulo',
      });
      const crear = vi
        .spyOn(servicioH28, 'crear')
        .mockRejectedValue(errorInternoH28);

      try {
        const respuesta = await http()
          .patch(`/api/v1/incidencias/${ids.incidenciaFalloH28}/estado`)
          .set('Authorization', bearerAdmin)
          .send({ estado: 'RESUELTA' })
          .expect(500);
        expect(respuesta.body).toEqual({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'No se pudo completar la operación. Intente de nuevo.',
        });

        const [incidencia] = await database().$queryRaw<
          Array<{ estado: string; updatedAt: Date }>
        >`
          SELECT "estado"::text AS "estado", "updated_at" AS "updatedAt"
          FROM "incidencias" WHERE "id" = ${ids.incidenciaFalloH28}::uuid
        `;
        expect(incidencia?.estado).toBe('RESUELTA');

        const historial = await database().$queryRaw<
          Array<{ actorId: string; createdAt: Date }>
        >`
          SELECT "actor_id"::text AS "actorId", "created_at" AS "createdAt"
          FROM "historial_incidencia"
          WHERE "incidencia_id" = ${ids.incidenciaFalloH28}::uuid
            AND "valor_anterior" = 'EN_PROCESO'
            AND "valor_nuevo" = 'RESUELTA'
        `;
        expect(historial).toHaveLength(1);
        expect(historial[0]?.actorId).toBe(ids.administrador);
        expect(historial[0]?.createdAt.toISOString()).toBe(
          incidencia?.updatedAt.toISOString(),
        );

        const evidencias = await database().$queryRaw<Array<{ id: string }>>`
          SELECT "id"::text AS "id" FROM "evidencias_incidencia"
          WHERE "incidencia_id" = ${ids.incidenciaFalloH28}::uuid
        `;
        expect(evidencias).toEqual([{ id: ids.evidenciaFalloH28 }]);

        const avisos = await database().$queryRaw<Array<{ id: string }>>`
          SELECT "id"::text AS "id" FROM "notificaciones"
          WHERE "clave_evento" = ${claveEventoFalloH28}
        `;
        expect(avisos).toEqual([]);
        expect(crear).toHaveBeenCalledOnce();
      } finally {
        crear.mockRestore();
      }
    });
  },
);
