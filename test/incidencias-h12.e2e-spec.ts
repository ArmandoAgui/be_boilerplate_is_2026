import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl) {
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
}

const RUTA = '/api/v1/incidencias';
const prefijo = `h12-${randomUUID().slice(0, 8)}`;
const ids = {
  residente: randomUUID(),
  otroResidente: randomUUID(),
  residenteSinReportes: randomUUID(),
  inactivo: randomUUID(),
  eliminado: randomUUID(),
  administrador: randomUUID(),
  seguridadA: randomUUID(),
  seguridadB: randomUUID(),
  torre: randomUUID(),
  seccion: randomUUID(),
  unidad: randomUUID(),
  otraUnidad: randomUUID(),
  area: randomUUID(),
};

type EstadoIncidenciaTest =
  | 'ABIERTA'
  | 'ASIGNADA'
  | 'EN_PROCESO'
  | 'RESUELTA';

type SqlClient = {
  $executeRaw: (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<number>;
  $queryRaw: <T>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>;
  $transaction: <T>(
    callback: (tx: Pick<SqlClient, '$executeRaw'>) => Promise<T>,
  ) => Promise<T>;
};

describe.skipIf(!testUrl)('H12 HTTP + PostgreSQL local aislado', () => {
  let app: INestApplication | undefined;
  let prisma: SqlClient | undefined;
  let uploadsDir: string | undefined;
  let residenteBearer: string;
  let otroResidenteBearer: string;
  let residenteSinReportesBearer: string;
  let inactivoBearer: string;
  let eliminadoBearer: string;
  let tokenExpirado: string;
  const tokenInvalido = 'Bearer token-h12-invalido';
  let administradorBearer: string;
  let seguridadABearer: string;
  let seguridadBBearer: string;
  let jpeg: Buffer;
  const incidenciasCreadas: string[] = [];

  const db = (): SqlClient => {
    if (!prisma) throw new Error('La conexión aislada H12 no está preparada.');
    return prisma;
  };
  const http = () => {
    if (!app) throw new Error('La aplicación H12 no está preparada.');
    return request(app.getHttpServer());
  };
  const insertarUsuario = async (
    id: string,
    nombre: string,
    rol: 'RESIDENTE' | 'ADMINISTRADOR' | 'SEGURIDAD',
    activo = true,
  ) => {
    const email = `${prefijo}-${nombre.replaceAll(' ', '-').toLowerCase()}@condominio.test`;
    await db().$executeRaw`
      INSERT INTO "users" (
        "id", "email", "password_hash", "is_active", "rol", "nombre", "updated_at"
      ) VALUES (
        ${id}::uuid, ${email},
        'hash-h12-test', ${activo}, ${rol}::"Rol", ${nombre}, CURRENT_TIMESTAMP
      )
    `;
  };
  const crear = (bearer: string, unidadId: string, descripcion: string) =>
    http()
      .post(RUTA)
      .set('Authorization', bearer)
      .field('lugarTipo', 'UNIDAD')
      .field('unidadId', unidadId)
      .field('categoria', 'FUGA')
      .field('descripcion', descripcion);
  const insertarIncidenciaPersistida = async ({
    id,
    residenteId,
    unidadId,
    estado,
    createdAt,
  }: {
    id: string;
    residenteId: string;
    unidadId: string;
    estado: EstadoIncidenciaTest;
    createdAt: Date;
  }) => {
    await db().$executeRaw`
      INSERT INTO "incidencias" (
        "id", "residente_id", "lugar_tipo", "unidad_id", "categoria",
        "descripcion", "estado", "created_at", "updated_at"
      ) VALUES (
        ${id}::uuid, ${residenteId}::uuid, 'UNIDAD'::"LugarTipo",
        ${unidadId}::uuid, 'OTRO'::"Categoria",
        'Fixture de listado H12 aislado', ${estado}::"EstadoIncidencia",
        ${createdAt}, ${createdAt}
      )
    `;
    incidenciasCreadas.push(id);
  };
  const limpiarIncidencias = async () => {
    if (!prisma) return;
    for (const incidenciaId of incidenciasCreadas.splice(0)) {
      await db().$executeRaw`
        DELETE FROM "notificaciones"
        WHERE "referencia_id" = ${incidenciaId}::uuid
      `;
      await db().$executeRaw`
        DELETE FROM "historial_incidencia"
        WHERE "incidencia_id" = ${incidenciaId}::uuid
      `;
      await db().$executeRaw`
        DELETE FROM "evidencias_incidencia"
        WHERE "incidencia_id" = ${incidenciaId}::uuid
      `;
      await db().$executeRaw`
        DELETE FROM "incidencias" WHERE "id" = ${incidenciaId}::uuid
      `;
    }
  };
  const snapshotIncidencia = async (incidenciaId: string) => {
    const [snapshot] = await db().$queryRaw<
      Array<{
        estado: string;
        updatedAt: Date;
        historiales: number;
        evidencias: number;
        avisos: number;
      }>
    >`
      SELECT
        i."estado"::text AS "estado",
        i."updated_at" AS "updatedAt",
        (SELECT COUNT(*)::int FROM "historial_incidencia" h
          WHERE h."incidencia_id" = i."id") AS "historiales",
        (SELECT COUNT(*)::int FROM "evidencias_incidencia" e
          WHERE e."incidencia_id" = i."id") AS "evidencias",
        (SELECT COUNT(*)::int FROM "notificaciones" n
          WHERE n."user_id" = i."residente_id"
            AND n."referencia_id" = i."id") AS "avisos"
      FROM "incidencias" i
      WHERE i."id" = ${incidenciaId}::uuid
    `;
    if (!snapshot) throw new Error(`No existe la incidencia ${incidenciaId}.`);
    return snapshot;
  };

  beforeAll(async () => {
    if (!testUrl) {
      throw new Error('TEST_DATABASE_URL es obligatorio para la suite H12.');
    }

    uploadsDir = await mkdtemp(join(tmpdir(), 'h12-e2e-uploads-'));
    process.env.DATABASE_URL = testUrl;
    process.env.JWT_SECRET = 'clave-aislada-exclusiva-pruebas-h12-2026';
    process.env.NODE_ENV = 'test';
    process.env.UPLOADS_DIR = uploadsDir;
    jpeg = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: '#3478bf',
      },
    })
      .jpeg()
      .toBuffer();

    const { AppModule } = await import('../dist/app.module.js');
    const { PrismaService } =
      await import('../dist/prisma/services/prisma.service.js');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService) as SqlClient;

    await insertarUsuario(ids.residente, 'Residente H12', 'RESIDENTE');
    await insertarUsuario(
      ids.otroResidente,
      'Otro residente H12',
      'RESIDENTE',
    );
    await insertarUsuario(
      ids.residenteSinReportes,
      'Residente sin reportes H12',
      'RESIDENTE',
    );
    await insertarUsuario(ids.inactivo, 'Residente inactivo H12', 'RESIDENTE', false);
    await insertarUsuario(ids.eliminado, 'Residente eliminado H12', 'RESIDENTE');
    await insertarUsuario(
      ids.administrador,
      'Administrador H12',
      'ADMINISTRADOR',
    );
    await insertarUsuario(ids.seguridadA, 'Seguridad H12 A', 'SEGURIDAD');
    await insertarUsuario(ids.seguridadB, 'Seguridad H12 B', 'SEGURIDAD');

    await db().$executeRaw`
      INSERT INTO "Torre" ("id", "nombre")
      VALUES (${ids.torre}::uuid, ${`${prefijo}-torre`})
    `;
    await db().$executeRaw`
      INSERT INTO "Seccion" ("id", "nombre", "torreId")
      VALUES (${ids.seccion}::uuid, 'Norte', ${ids.torre}::uuid)
    `;
    for (const [unidadId, suffix] of [
      [ids.unidad, 'principal'],
      [ids.otraUnidad, 'secundaria'],
    ] as const) {
      await db().$executeRaw`
        INSERT INTO "Unidad" (
          "id", "codigo", "torreId", "seccionId", "cuotaMensual"
        ) VALUES (
          ${unidadId}::uuid, ${`${prefijo}-${suffix}`},
          ${ids.torre}::uuid, ${ids.seccion}::uuid, 50.00
        )
      `;
    }
    for (const [userId, unitId] of [
      [ids.residente, ids.unidad],
      [ids.otroResidente, ids.otraUnidad],
    ]) {
      await db().$executeRaw`
        INSERT INTO "UsuarioUnidad" ("id", "userId", "unidadId")
        VALUES (${randomUUID()}::uuid, ${userId}::uuid, ${unitId}::uuid)
      `;
    }
    await db().$executeRaw`
      INSERT INTO "AreaComun" ("id", "nombre", "capacidad", "updatedAt")
      VALUES (
        ${ids.area}::uuid, ${`${prefijo}-área común`}, 40, CURRENT_TIMESTAMP
      )
    `;

    const jwt = app.get(JwtService);
    const token = (id: string, nombre: string, expiresIn?: number) => {
      const payload = {
        sub: id,
        email: `${prefijo}-${nombre.replaceAll(' ', '-').toLowerCase()}@condominio.test`,
      };
      return `Bearer ${expiresIn === undefined ? jwt.sign(payload) : jwt.sign(payload, { expiresIn })}`;
    };
    residenteBearer = token(ids.residente, 'Residente H12');
    otroResidenteBearer = token(ids.otroResidente, 'Otro residente H12');
    residenteSinReportesBearer = token(
      ids.residenteSinReportes,
      'Residente sin reportes H12',
    );
    inactivoBearer = token(ids.inactivo, 'Residente inactivo H12');
    eliminadoBearer = token(ids.eliminado, 'Residente eliminado H12');
    tokenExpirado = token(ids.residente, 'Residente H12', -1);
    administradorBearer = token(ids.administrador, 'Administrador H12');
    seguridadABearer = token(ids.seguridadA, 'Seguridad H12 A');
    seguridadBBearer = token(ids.seguridadB, 'Seguridad H12 B');
    await db().$executeRaw`DELETE FROM "users" WHERE "id" = ${ids.eliminado}::uuid`;
  }, 60_000);

  afterEach(limpiarIncidencias, 30_000);

  afterAll(async () => {
    if (prisma) {
      await limpiarIncidencias();
      await db().$executeRaw`
        DELETE FROM "UsuarioUnidad"
        WHERE "userId" IN (${ids.residente}::uuid, ${ids.otroResidente}::uuid)
      `;
      await db().$executeRaw`
        DELETE FROM "Unidad"
        WHERE "id" IN (${ids.unidad}::uuid, ${ids.otraUnidad}::uuid)
      `;
      await db().$executeRaw`
        DELETE FROM "Seccion" WHERE "id" = ${ids.seccion}::uuid
      `;
      await db().$executeRaw`
        DELETE FROM "Torre" WHERE "id" = ${ids.torre}::uuid
      `;
      await db().$executeRaw`
        DELETE FROM "users"
        WHERE "id" IN (
          ${ids.residente}::uuid, ${ids.otroResidente}::uuid,
          ${ids.residenteSinReportes}::uuid, ${ids.inactivo}::uuid,
          ${ids.eliminado}::uuid,
          ${ids.administrador}::uuid, ${ids.seguridadA}::uuid,
          ${ids.seguridadB}::uuid
        )
      `;
      await db().$executeRaw`
        DELETE FROM "AreaComun" WHERE "id" = ${ids.area}::uuid
      `;
    }
    await app?.close();
    if (uploadsDir) await rm(uploadsDir, { recursive: true, force: true });
  }, 30_000);

  it('coordina H9, el listado/detalle H12 y la asignación/reasignación H10', async () => {
    const creada = await crear(
      residenteBearer,
      ids.unidad,
      'Filtración junto al ascensor',
    )
      .attach('fotos', jpeg, {
        filename: 'evidencia.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const incidenciaId = creada.body.id as string;
    incidenciasCreadas.push(incidenciaId);
    const evidenciaId = creada.body.evidencias[0].id as string;
    const urlEvidencia = `${RUTA}/${incidenciaId}/evidencias/${evidenciaId}`;

    const listadoInicial = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .expect(200);
    expect(listadoInicial.headers['cache-control']).toBe('private, no-store');
    expect(listadoInicial.body).toMatchObject({
      total: 1,
      pagina: 1,
      tamanoPagina: 20,
      datos: [
        {
          id: incidenciaId,
          estado: 'ABIERTA',
          categoria: 'FUGA',
        },
      ],
    });
    expect(listadoInicial.body.datos[0]).not.toHaveProperty('descripcion');

    const detalleInicial = await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', residenteBearer)
      .expect(200);
    expect(detalleInicial.headers['cache-control']).toBe('private, no-store');
    expect(detalleInicial.body).toMatchObject({
      id: incidenciaId,
      lugar: `${prefijo}-principal`,
      estado: 'ABIERTA',
      prioridad: null,
      responsable: null,
      evidencias: [{ id: evidenciaId, url: urlEvidencia }],
      historial: [
        {
          campo: 'ESTADO',
          valorAnterior: null,
          valorNuevo: 'ABIERTA',
          actor: 'Residente H12',
        },
      ],
    });

    await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', administradorBearer)
      .expect(403)
      .expect('Cache-Control', 'private, no-store');
    await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', seguridadABearer)
      .expect(403);
    await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .query({ estado: 'NO_EXISTE' })
      .expect(400)
      .expect('Cache-Control', 'private, no-store');
    await http()
      .get(`${RUTA}/no-es-un-uuid`)
      .set('Authorization', residenteBearer)
      .expect(404)
      .expect('Cache-Control', 'private, no-store');

    const detalleAjeno = await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', otroResidenteBearer)
      .expect(404);
    const detalleInexistente = await http()
      .get(`${RUTA}/${randomUUID()}`)
      .set('Authorization', residenteBearer)
      .expect(404);
    expect(detalleAjeno.body).toEqual(detalleInexistente.body);
    await http()
      .get(urlEvidencia)
      .set('Authorization', otroResidenteBearer)
      .expect(404);
    await http()
      .get(urlEvidencia)
      .set('Authorization', seguridadABearer)
      .expect(404);
    await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', seguridadABearer)
      .expect(404);

    const otraCreada = await crear(
      otroResidenteBearer,
      ids.otraUnidad,
      'Ruido constante en el pasillo',
    ).expect(201);
    const otraIncidenciaId = otraCreada.body.id as string;
    incidenciasCreadas.push(otraIncidenciaId);

    const otraDetalle = await http()
      .get(`${RUTA}/${otraIncidenciaId}`)
      .set('Authorization', administradorBearer)
      .expect(200);
    expect(otraDetalle.body.evidencias).toEqual([]);
    expect(otraDetalle.body.prioridad).toBeNull();
    expect(otraDetalle.body.responsable).toBeNull();
    await http()
      .get(`${RUTA}/${otraIncidenciaId}/evidencias/${evidenciaId}`)
      .set('Authorization', administradorBearer)
      .expect(404);

    const asignada = await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', administradorBearer)
      .send({ prioridad: 'ALTA', responsableId: ids.seguridadA })
      .expect(200);
    expect(asignada.body).toMatchObject({
      id: incidenciaId,
      estado: 'ASIGNADA',
      prioridad: 'ALTA',
      responsable: { id: ids.seguridadA, nombre: 'Seguridad H12 A' },
    });

    const detalleAsignado = await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', seguridadABearer)
      .expect(200);
    expect(detalleAsignado.body).toMatchObject({
      estado: 'ASIGNADA',
      prioridad: 'ALTA',
      responsable: { id: ids.seguridadA, nombre: 'Seguridad H12 A' },
    });
    expect(detalleAsignado.body.historial).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: 'PRIORIDAD', valorNuevo: 'ALTA' }),
        expect.objectContaining({
          campo: 'RESPONSABLE',
          valorAnterior: null,
          valorNuevo: ids.seguridadA,
        }),
        expect.objectContaining({
          campo: 'ESTADO',
          valorAnterior: 'ABIERTA',
          valorNuevo: 'ASIGNADA',
        }),
      ]),
    );
    await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', seguridadABearer)
      .expect(403);
    await http()
      .get(urlEvidencia)
      .set('Authorization', seguridadABearer)
      .expect(200)
      .expect('Cache-Control', 'private, no-store');

    await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', administradorBearer)
      .send({ responsableId: ids.seguridadB })
      .expect(200);
    await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', seguridadABearer)
      .expect(404);
    await http()
      .get(urlEvidencia)
      .set('Authorization', seguridadABearer)
      .expect(404);

    const reasignada = await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', seguridadBBearer)
      .expect(200);
    expect(reasignada.body.responsable).toEqual({
      id: ids.seguridadB,
      nombre: 'Seguridad H12 B',
    });
    await http()
      .get(urlEvidencia)
      .set('Authorization', seguridadBBearer)
      .expect(200);
    await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', residenteBearer)
      .expect(200);
    await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', administradorBearer)
      .expect(200);
    await http()
      .get(urlEvidencia)
      .set('Authorization', administradorBearer)
      .expect(200);

    const listadoAsignado = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .query({ estado: 'ASIGNADA' })
      .expect(200);
    expect(listadoAsignado.body).toMatchObject({
      total: 1,
      datos: [{ id: incidenciaId, estado: 'ASIGNADA' }],
    });
  }, 30_000);

  it('expone en H12 las transiciones e historial H11 y el aviso real H28', async () => {
    const creada = await crear(
      residenteBearer,
      ids.unidad,
      'Fuga que requiere seguimiento y resolución',
    ).expect(201);
    const incidenciaId = creada.body.id as string;
    incidenciasCreadas.push(incidenciaId);

    await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', administradorBearer)
      .send({ prioridad: 'ALTA', responsableId: ids.seguridadA })
      .expect(200);
    await http()
      .patch(`${RUTA}/${incidenciaId}/estado`)
      .set('Authorization', administradorBearer)
      .send({ estado: 'EN_PROCESO' })
      .expect(200);

    const detalleEnProceso = await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', residenteBearer)
      .expect(200);
    expect(detalleEnProceso.body).toMatchObject({ estado: 'EN_PROCESO' });
    expect(detalleEnProceso.body.historial).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campo: 'ESTADO',
          valorAnterior: 'ASIGNADA',
          valorNuevo: 'EN_PROCESO',
          actor: 'Administrador H12',
        }),
        expect.objectContaining({ campo: 'PRIORIDAD', valorNuevo: 'ALTA' }),
        expect.objectContaining({
          campo: 'RESPONSABLE',
          valorNuevo: ids.seguridadA,
        }),
      ]),
    );
    const listadoEnProceso = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .query({ estado: 'EN_PROCESO' })
      .expect(200);
    expect(listadoEnProceso.body).toMatchObject({
      total: 1,
      datos: [{ id: incidenciaId, estado: 'EN_PROCESO' }],
    });

    await http()
      .patch(`${RUTA}/${incidenciaId}/estado`)
      .set('Authorization', administradorBearer)
      .send({ estado: 'RESUELTA' })
      .expect(200);

    const detalleResuelta = await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', residenteBearer)
      .expect(200);
    expect(detalleResuelta.body).toMatchObject({ estado: 'RESUELTA' });
    expect(detalleResuelta.body.historial).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campo: 'ESTADO',
          valorAnterior: 'EN_PROCESO',
          valorNuevo: 'RESUELTA',
          actor: 'Administrador H12',
        }),
        expect.objectContaining({
          campo: 'ESTADO',
          valorAnterior: 'ASIGNADA',
          valorNuevo: 'EN_PROCESO',
        }),
        expect.objectContaining({
          campo: 'ESTADO',
          valorAnterior: null,
          valorNuevo: 'ABIERTA',
        }),
      ]),
    );
    const listadoResuelta = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .query({ estado: 'RESUELTA' })
      .expect(200);
    expect(listadoResuelta.body).toMatchObject({
      total: 1,
      datos: [{ id: incidenciaId, estado: 'RESUELTA' }],
    });

    const [aviso] = await db().$queryRaw<
      Array<{ userId: string; tipoEvento: string; claveEvento: string }>
    >`
      SELECT "user_id"::text AS "userId", "tipo_evento"::text AS "tipoEvento",
             "clave_evento" AS "claveEvento"
      FROM "notificaciones"
      WHERE "referencia_id" = ${incidenciaId}::uuid
    `;
    expect(aviso).toEqual({
      userId: ids.residente,
      tipoEvento: 'INCIDENCIA_RESUELTA',
      claveEvento: `INCIDENCIA_RESUELTA:${incidenciaId}`,
    });

    const bandejaAutor = await http()
      .get('/api/v1/notificaciones/mias?moduloOrigen=INCIDENCIAS')
      .set('Authorization', residenteBearer)
      .expect(200);
    expect(
      bandejaAutor.body.datos.some(
        (notificacion: { referenciaId: string }) =>
          notificacion.referenciaId === incidenciaId,
      ),
    ).toBe(true);
    const bandejaVecino = await http()
      .get('/api/v1/notificaciones/mias?moduloOrigen=INCIDENCIAS')
      .set('Authorization', otroResidenteBearer)
      .expect(200);
    expect(
      bandejaVecino.body.datos.some(
        (notificacion: { referenciaId: string }) =>
          notificacion.referenciaId === incidenciaId,
      ),
    ).toBe(false);
  }, 30_000);

  it('muestra en el detalle H12 el cierre confirmado si falla el aviso H28', async () => {
    const creada = await crear(
      residenteBearer,
      ids.unidad,
      'Incidencia cuya notificación posterior falla',
    ).expect(201);
    const incidenciaId = creada.body.id as string;
    incidenciasCreadas.push(incidenciaId);
    await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', administradorBearer)
      .send({ responsableId: ids.seguridadA })
      .expect(200);
    await http()
      .patch(`${RUTA}/${incidenciaId}/estado`)
      .set('Authorization', administradorBearer)
      .send({ estado: 'EN_PROCESO' })
      .expect(200);

    const { NotificacionesService } = await import(
      '../dist/notificaciones/services/notificaciones.service.js'
    );
    const notificaciones = app!.get(NotificacionesService);
    const crearAviso = vi
      .spyOn(notificaciones, 'crear')
      .mockRejectedValue(new Error('Fallo H28 inyectado por la prueba H12'));
    try {
      await http()
        .patch(`${RUTA}/${incidenciaId}/estado`)
        .set('Authorization', administradorBearer)
        .send({ estado: 'RESUELTA' })
        .expect(500);

      const detalle = await http()
        .get(`${RUTA}/${incidenciaId}`)
        .set('Authorization', residenteBearer)
        .expect(200);
      expect(detalle.body.estado).toBe('RESUELTA');
      expect(detalle.body.historial).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            campo: 'ESTADO',
            valorAnterior: 'EN_PROCESO',
            valorNuevo: 'RESUELTA',
            actor: 'Administrador H12',
          }),
        ]),
      );
      expect(crearAviso).toHaveBeenCalledOnce();
      const avisos = await db().$queryRaw<Array<{ id: string }>>`
        SELECT "id"::text AS "id"
        FROM "notificaciones"
        WHERE "referencia_id" = ${incidenciaId}::uuid
      `;
      expect(avisos).toEqual([]);
    } finally {
      crearAviso.mockRestore();
    }
  }, 30_000);

  it('rechaza sesiones ausentes, inválidas, vencidas, inactivas o eliminadas en ambos GET', async () => {
    const idInexistente = randomUUID();
    const bearerNoValido = [
      tokenInvalido,
      tokenExpirado,
      inactivoBearer,
      eliminadoBearer,
    ];

    for (const ruta of [`${RUTA}/mias`, `${RUTA}/${idInexistente}`]) {
      const sinSesion = await http().get(ruta).expect(401);
      expect(sinSesion.headers['cache-control']).toBe('private, no-store');
      for (const bearer of bearerNoValido) {
        const respuesta = await http()
          .get(ruta)
          .set('Authorization', bearer)
          .expect(401);
        expect(respuesta.headers['cache-control']).toBe('private, no-store');
        expect(respuesta.body).not.toHaveProperty('email');
        expect(respuesta.body).not.toHaveProperty('passwordHash');
      }
    }
  });

  it('filtra todos los estados por residente y pagina con orden estable en empates', async () => {
    const fechaEmpatada = new Date('2026-11-14T16:00:00.000Z');
    const idsOrdenados = Array.from({ length: 25 }, (_, index) =>
      `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    );
    const estados: EstadoIncidenciaTest[] = [
      'ABIERTA',
      'ASIGNADA',
      'EN_PROCESO',
      'RESUELTA',
    ];

    for (let index = 0; index < idsOrdenados.length; index += 1) {
      await insertarIncidenciaPersistida({
        id: idsOrdenados[index],
        residenteId: ids.residente,
        unidadId: ids.unidad,
        estado: estados[index % estados.length],
        createdAt: fechaEmpatada,
      });
    }
    const idOtroResidente = randomUUID();
    await insertarIncidenciaPersistida({
      id: idOtroResidente,
      residenteId: ids.otroResidente,
      unidadId: ids.otraUnidad,
      estado: 'RESUELTA',
      createdAt: fechaEmpatada,
    });

    const primera = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .expect(200);
    const idsDescendentes = [...idsOrdenados].sort().reverse();
    expect(primera.body).toMatchObject({
      total: 25,
      pagina: 1,
      tamanoPagina: 20,
    });
    expect(primera.body.datos.map((fila: { id: string }) => fila.id)).toEqual(
      idsDescendentes.slice(0, 20),
    );
    expect(Object.keys(primera.body.datos[0]).sort()).toEqual(
      ['id', 'codigo', 'categoria', 'creadaAt', 'estado'].sort(),
    );

    const segunda = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .query({ pagina: 2 })
      .expect(200);
    expect(segunda.body.total).toBe(25);
    expect(segunda.body.datos.map((fila: { id: string }) => fila.id)).toEqual(
      idsDescendentes.slice(20),
    );

    const completa = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .query({ tamanoPagina: 50 })
      .expect(200);
    expect(completa.body.datos).toHaveLength(25);
    expect(completa.body.datos.map((fila: { id: string }) => fila.id)).toEqual(
      idsDescendentes,
    );

    const limiteUno = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .query({ pagina: 25, tamanoPagina: 1 })
      .expect(200);
    expect(limiteUno.body.datos.map((fila: { id: string }) => fila.id)).toEqual(
      [idsDescendentes[24]],
    );
    const paginaVacia = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .query({ pagina: 3 })
      .expect(200);
    expect(paginaVacia.body).toMatchObject({ total: 25, datos: [] });

    for (const [estado, total] of [
      ['ABIERTA', 7],
      ['ASIGNADA', 6],
      ['EN_PROCESO', 6],
      ['RESUELTA', 6],
    ] as const) {
      const filtrada = await http()
        .get(`${RUTA}/mias`)
        .set('Authorization', residenteBearer)
        .query({ estado, tamanoPagina: 50 })
        .expect(200);
      expect(filtrada.body.total).toBe(total);
      expect(
        filtrada.body.datos.every(
          (fila: { estado: string }) => fila.estado === estado,
        ),
      ).toBe(true);
    }

    const conjuntoOtro = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', otroResidenteBearer)
      .expect(200);
    expect(conjuntoOtro.body).toMatchObject({
      total: 1,
      datos: [{ id: idOtroResidente, estado: 'RESUELTA' }],
    });
    const sinReportes = await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteSinReportesBearer)
      .expect(200);
    expect(sinReportes.body).toMatchObject({
      total: 0,
      pagina: 1,
      tamanoPagina: 20,
      datos: [],
    });
  }, 30_000);

  it('rechaza queries fuera de contrato y no amplía el alcance por parámetros extra', async () => {
    const queries = [
      'estado=NO_EXISTE',
      'estado=',
      'estado=ABIERTA&estado=RESUELTA',
      'parametroDesconocido=valor',
      'pagina=-1',
      'pagina=0',
      'pagina=1.5',
      'pagina=',
      'tamanoPagina=0',
      'tamanoPagina=1.5',
      'tamanoPagina=',
      'tamanoPagina=51',
      `residenteId=${ids.otroResidente}`,
      `unidadId=${ids.otraUnidad}`,
    ];

    for (const query of queries) {
      const respuesta = await http()
        .get(`${RUTA}/mias`)
        .set('Authorization', residenteBearer)
        .query(query)
        .expect(400);
      expect(respuesta.body).toHaveProperty('statusCode', 400);
      expect(respuesta.headers['cache-control']).toBe('private, no-store');
    }

    await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', administradorBearer)
      .expect(403);
    await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', seguridadABearer)
      .expect(403);
  }, 30_000);

  it('lee estado e historial desde el mismo snapshot durante un commit concurrente', async () => {
    const incidenciaId = randomUUID();
    const fechaAnterior = new Date('2026-11-14T15:00:00.000Z');
    const fechaNueva = new Date('2026-11-14T15:01:00.000Z');
    await insertarIncidenciaPersistida({
      id: incidenciaId,
      residenteId: ids.residente,
      unidadId: ids.unidad,
      estado: 'ASIGNADA',
      createdAt: fechaAnterior,
    });
    await db().$executeRaw`
      UPDATE "incidencias"
      SET "responsable_id" = ${ids.seguridadA}::uuid
      WHERE "id" = ${incidenciaId}::uuid
    `;
    await db().$executeRaw`
      INSERT INTO "historial_incidencia" (
        "id", "incidencia_id", "campo", "valor_anterior", "valor_nuevo",
        "actor_id", "created_at"
      ) VALUES (
        ${randomUUID()}::uuid, ${incidenciaId}::uuid,
        'ESTADO'::"CampoHistorial", 'ABIERTA', 'ASIGNADA',
        ${ids.seguridadA}::uuid, ${fechaAnterior}
      )
    `;

    const { IncidenciasRepository } = await import(
      '../dist/incidencias/repositories/incidencias.repository.js'
    );
    const repository = app!.get(IncidenciasRepository);
    const originalPrisma = Reflect.get(repository, 'prisma') as object;
    const originalTransaction = Reflect.get(
      originalPrisma,
      '$transaction',
    ) as (
      callback: (tx: object) => Promise<unknown>,
      options?: unknown,
    ) => Promise<unknown>;

    let avisarLecturaPausada!: () => void;
    const lecturaPausada = new Promise<void>((resolve) => {
      avisarLecturaPausada = resolve;
    });
    let reanudarLectura!: () => void;
    const continuarLectura = new Promise<void>((resolve) => {
      reanudarLectura = resolve;
    });
    let consultasDeLectura = 0;
    const clienteInterceptado = new Proxy(originalPrisma, {
      get(target, property) {
        if (property !== '$transaction') {
          return Reflect.get(target, property, target);
        }
        return (
          callback: (tx: object) => Promise<unknown>,
          options?: unknown,
        ) => {
          return originalTransaction.call(
            originalPrisma,
            (tx: object) => {
              const txInterceptado = new Proxy(tx, {
                get(txTarget, txProperty) {
                  const metodo = Reflect.get(
                    txTarget,
                    txProperty,
                    txTarget,
                  );
                  if (txProperty !== '$queryRaw' || typeof metodo !== 'function') {
                    return metodo;
                  }
                  return async (...args: unknown[]) => {
                    const resultado = await Reflect.apply(metodo, txTarget, args);
                    consultasDeLectura += 1;
                    if (consultasDeLectura === 3) {
                      avisarLecturaPausada();
                      await continuarLectura;
                    }
                    return resultado;
                  };
                },
              });
              return callback(txInterceptado);
            },
            options,
          );
        };
      },
    });
    Reflect.set(repository, 'prisma', clienteInterceptado);

    let respuestaPendiente: Promise<request.Response> | undefined;
    try {
      respuestaPendiente = http()
        .get(`${RUTA}/${incidenciaId}`)
        .set('Authorization', residenteBearer)
        .then((respuesta) => respuesta);

      let timeout: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        lecturaPausada,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('La lectura no alcanzó su punto de pausa.')),
            5_000,
          );
        }),
      ]).finally(() => {
        if (timeout) clearTimeout(timeout);
      });

      await db().$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE "incidencias"
          SET "estado" = 'RESUELTA'::"EstadoIncidencia",
              "updated_at" = ${fechaNueva}
          WHERE "id" = ${incidenciaId}::uuid
        `;
        await tx.$executeRaw`
          INSERT INTO "historial_incidencia" (
            "id", "incidencia_id", "campo", "valor_anterior", "valor_nuevo",
            "actor_id", "created_at"
          ) VALUES (
            ${randomUUID()}::uuid, ${incidenciaId}::uuid,
            'ESTADO'::"CampoHistorial", 'ASIGNADA', 'RESUELTA',
            ${ids.seguridadA}::uuid, ${fechaNueva}
          )
        `;
      });
      reanudarLectura();

      const detalleConcurrente = await respuestaPendiente;
      expect(detalleConcurrente.status).toBe(200);
      expect(detalleConcurrente.body.estado).toBe('ASIGNADA');
      expect(
        detalleConcurrente.body.historial.some(
          (entrada: { valorNuevo: string }) => entrada.valorNuevo === 'RESUELTA',
        ),
      ).toBe(false);

      const detallePosterior = await http()
        .get(`${RUTA}/${incidenciaId}`)
        .set('Authorization', residenteBearer)
        .expect(200);
      expect(detallePosterior.body.estado).toBe('RESUELTA');
      expect(
        detallePosterior.body.historial.some(
          (entrada: { valorNuevo: string }) => entrada.valorNuevo === 'RESUELTA',
        ),
      ).toBe(true);
    } finally {
      reanudarLectura();
      Reflect.set(repository, 'prisma', originalPrisma);
      await respuestaPendiente?.catch(() => undefined);
    }
  }, 30_000);

  it('lee el lugar de área común y conserva la base sin escrituras de consulta', async () => {
    const creada = await http()
      .post(RUTA)
      .set('Authorization', residenteBearer)
      .field('lugarTipo', 'AREA_COMUN')
      .field('areaId', ids.area)
      .field('categoria', 'ASCENSOR')
      .field('descripcion', 'El ascensor presenta una falla')
      .expect(201);
    const incidenciaId = creada.body.id as string;
    incidenciasCreadas.push(incidenciaId);

    const antes = await snapshotIncidencia(incidenciaId);
    const detalle = await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', residenteBearer)
      .expect(200);
    expect(detalle.body).toMatchObject({
      lugar: `${prefijo}-área común`,
      estado: 'ABIERTA',
      prioridad: null,
      responsable: null,
      evidencias: [],
      historial: [
        {
          campo: 'ESTADO',
          valorAnterior: null,
          valorNuevo: 'ABIERTA',
          actor: 'Residente H12',
        },
      ],
    });
    expect(Object.keys(detalle.body).sort()).toEqual(
      [
        'id',
        'codigo',
        'categoria',
        'descripcion',
        'lugar',
        'estado',
        'prioridad',
        'responsable',
        'evidencias',
        'historial',
      ].sort(),
    );
    expect(detalle.body.historial[0].fecha).toMatch(/Z$/);
    expect(detalle.body).not.toHaveProperty('residenteId');
    expect(JSON.stringify(detalle.body)).not.toContain('password');
    expect(JSON.stringify(detalle.body)).not.toContain('email');
    expect(JSON.stringify(detalle.body)).not.toContain('rutaInterna');

    await http()
      .get(`${RUTA}/${incidenciaId}`)
      .set('Authorization', administradorBearer)
      .expect(200);
    await http()
      .get(`${RUTA}/mias`)
      .set('Authorization', residenteBearer)
      .expect(200);
    const despues = await snapshotIncidencia(incidenciaId);
    expect(despues).toEqual(antes);

    await http()
      .get(`${RUTA}/${incidenciaId}/evidencias/not-a-uuid`)
      .set('Authorization', residenteBearer)
      .expect(400);
    await http()
      .get(`${RUTA}/${incidenciaId}/evidencias/${randomUUID()}`)
      .expect(401);
  }, 30_000);
});
