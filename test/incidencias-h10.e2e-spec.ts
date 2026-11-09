import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

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

const RUTA = '/api/v1/incidencias';
const prefijo = `h10-${randomUUID().slice(0, 8)}`;
const ids = {
  residente: randomUUID(),
  vecino: randomUUID(),
  administrador: randomUUID(),
  seguridadA: randomUUID(),
  seguridadB: randomUUID(),
  seguridadInactiva: randomUUID(),
  torre: randomUUID(),
  seccion: randomUUID(),
  unidad: randomUUID(),
};

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

type Estado = 'ABIERTA' | 'ASIGNADA' | 'EN_PROCESO' | 'RESUELTA';
type Prioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE' | null;

interface IncidenciaSeed {
  id?: string;
  prioridad?: Prioridad;
  estado?: Estado;
  responsableId?: string | null;
  createdAt?: Date;
}

describe.skipIf(!testUrl)('H10 HTTP + PostgreSQL local aislado', () => {
  let app: INestApplication | undefined;
  let prisma: SqlClient | undefined;
  let uploadsDir: string | undefined;
  let bearer: Record<string, string> = {};
  const incidenciasCreadas: string[] = [];
  let triggerActual: { trigger: string; funcion: string } | undefined;

  const db = (): SqlClient => {
    if (!prisma)
      throw new Error('La conexión de prueba H10 no está preparada.');
    return prisma;
  };
  const http = () => {
    if (!app) throw new Error('La aplicación de prueba H10 no está preparada.');
    return request(app.getHttpServer());
  };

  const insertarUsuario = async (
    id: string,
    rol: 'RESIDENTE' | 'ADMINISTRADOR' | 'SEGURIDAD',
    nombre: string,
    activo = true,
  ) => {
    await db().$executeRaw`
      INSERT INTO "users" (
        "id", "email", "password_hash", "is_active", "rol", "nombre", "updated_at"
      ) VALUES (
        ${id}::uuid,
        ${`${prefijo}-${nombre.replaceAll(' ', '-')}@condominio.test`},
        'hash-h10-test', ${activo}, ${rol}::"Rol", ${nombre}, CURRENT_TIMESTAMP
      )
    `;
  };

  const insertarIncidencia = async (opciones: IncidenciaSeed = {}) => {
    const id = opciones.id ?? randomUUID();
    const prioridad = opciones.prioridad ?? null;
    const estado = opciones.estado ?? 'ABIERTA';
    const responsableId = opciones.responsableId ?? null;
    const creadaAt = opciones.createdAt ?? new Date();

    await db().$executeRaw`
      INSERT INTO "incidencias" (
        "id", "residente_id", "lugar_tipo", "unidad_id", "categoria",
        "descripcion", "prioridad", "estado", "responsable_id", "created_at", "updated_at"
      ) VALUES (
        ${id}::uuid, ${ids.residente}::uuid, 'UNIDAD'::"LugarTipo",
        ${ids.unidad}::uuid, 'OTRO'::"Categoria", 'Incidencia H10 aislada',
        ${prioridad}::"Prioridad", ${estado}::"EstadoIncidencia",
        ${responsableId}::uuid, ${creadaAt}, ${creadaAt}
      )
    `;
    incidenciasCreadas.push(id);

    await insertarHistorial(
      id,
      'ESTADO',
      null,
      'ABIERTA',
      ids.residente,
      creadaAt,
    );
    const transiciones: Array<[string, string]> =
      estado === 'ABIERTA'
        ? []
        : estado === 'ASIGNADA'
          ? [['ABIERTA', 'ASIGNADA']]
          : estado === 'EN_PROCESO'
            ? [
                ['ABIERTA', 'ASIGNADA'],
                ['ASIGNADA', 'EN_PROCESO'],
              ]
            : [
                ['ABIERTA', 'ASIGNADA'],
                ['ASIGNADA', 'EN_PROCESO'],
                ['EN_PROCESO', 'RESUELTA'],
              ];
    for (const [anterior, nuevo] of transiciones) {
      await insertarHistorial(
        id,
        'ESTADO',
        anterior,
        nuevo,
        ids.administrador,
        creadaAt,
      );
    }
    return id;
  };

  const insertarHistorial = async (
    incidenciaId: string,
    campo: 'ESTADO' | 'PRIORIDAD' | 'RESPONSABLE',
    anterior: string | null,
    nuevo: string,
    actorId: string,
    createdAt = new Date(),
  ) => {
    await db().$executeRaw`
      INSERT INTO "historial_incidencia" (
        "id", "incidencia_id", "campo", "valor_anterior", "valor_nuevo", "actor_id", "created_at"
      ) VALUES (
        ${randomUUID()}::uuid, ${incidenciaId}::uuid, ${campo}::"CampoHistorial",
        ${anterior}, ${nuevo}, ${actorId}::uuid, ${createdAt}
      )
    `;
  };

  const leerIncidencia = async (id: string) => {
    const [fila] = await db().$queryRaw<
      Array<{
        prioridad: string | null;
        estado: Estado;
        responsableId: string | null;
        updatedAt: Date;
      }>
    >`
      SELECT
        "prioridad"::text AS "prioridad",
        "estado"::text AS "estado",
        "responsable_id"::text AS "responsableId",
        "updated_at" AS "updatedAt"
      FROM "incidencias"
      WHERE "id" = ${id}::uuid
    `;
    if (!fila) throw new Error(`No se encontró fixture H10 ${id}.`);
    return fila;
  };

  const contarHistorial = async (id: string) => {
    const [fila] = await db().$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS "total"
      FROM "historial_incidencia"
      WHERE "incidencia_id" = ${id}::uuid
    `;
    return Number(fila?.total ?? 0);
  };

  const leerCambios = async (id: string) =>
    db().$queryRaw<
      Array<{
        campo: string;
        valorAnterior: string | null;
        valorNuevo: string;
        actorId: string;
      }>
    >`
      SELECT
        "campo"::text AS "campo",
        "valor_anterior" AS "valorAnterior",
        "valor_nuevo" AS "valorNuevo",
        "actor_id"::text AS "actorId"
      FROM "historial_incidencia"
      WHERE "incidencia_id" = ${id}::uuid
        AND NOT ("campo" = 'ESTADO'::"CampoHistorial" AND "valor_anterior" IS NULL)
    `;

  const esperarConsultasBloqueadas = async (
    patron: string,
    cantidad: number,
  ) => {
    const limite = Date.now() + 10_000;
    while (Date.now() < limite) {
      const [fila] = await db().$queryRaw<Array<{ total: bigint }>>`
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

  beforeAll(async () => {
    if (!testUrl) {
      throw new Error('TEST_DATABASE_URL es obligatorio para la suite H10.');
    }
    uploadsDir = await mkdtemp(join(tmpdir(), 'h10-e2e-uploads-'));
    process.env.DATABASE_URL = testUrl;
    process.env.JWT_SECRET = 'clave-aislada-exclusiva-pruebas-h10-2026';
    process.env.NODE_ENV = 'test';
    process.env.UPLOADS_DIR = uploadsDir;

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

    await insertarUsuario(ids.residente, 'RESIDENTE', 'Zeta residente');
    await insertarUsuario(ids.vecino, 'RESIDENTE', 'Vecino H10');
    await insertarUsuario(
      ids.administrador,
      'ADMINISTRADOR',
      'Aaron administrador',
    );
    await insertarUsuario(ids.seguridadA, 'SEGURIDAD', 'Brenda seguridad');
    await insertarUsuario(ids.seguridadB, 'SEGURIDAD', 'Carlos seguridad');
    await insertarUsuario(
      ids.seguridadInactiva,
      'SEGURIDAD',
      'Diana seguridad inactiva',
      false,
    );

    await db().$executeRaw`
      INSERT INTO "Torre" ("id", "nombre")
      VALUES (${ids.torre}::uuid, ${`${prefijo}-torre`})
    `;
    await db().$executeRaw`
      INSERT INTO "Seccion" ("id", "nombre", "torreId")
      VALUES (${ids.seccion}::uuid, 'H10', ${ids.torre}::uuid)
    `;
    await db().$executeRaw`
      INSERT INTO "Unidad" ("id", "codigo", "torreId", "seccionId", "cuotaMensual")
      VALUES (
        ${ids.unidad}::uuid, ${`${prefijo}-unidad`},
        ${ids.torre}::uuid, ${ids.seccion}::uuid, 50.00
      )
    `;

    const jwt = app.get(JwtService);
    for (const [nombre, id] of Object.entries(ids)) {
      if (
        ![
          'residente',
          'vecino',
          'administrador',
          'seguridadA',
          'seguridadB',
          'seguridadInactiva',
        ].includes(nombre)
      ) {
        continue;
      }
      const user = id as string;
      const email = `${prefijo}-${nombre}@condominio.test`;
      bearer[nombre] = `Bearer ${jwt.sign({ sub: user, email })}`;
    }
    bearer.expirado = `Bearer ${jwt.sign(
      {
        sub: ids.administrador,
        email: `${prefijo}-administrador@condominio.test`,
      },
      { expiresIn: -1 },
    )}`;
    await db().$executeRaw`
      UPDATE "users" SET "is_active" = false WHERE "id" = ${ids.seguridadInactiva}::uuid
    `;
  }, 60_000);

  afterEach(async () => {
    if (!triggerActual || !prisma) return;
    await db().$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS "${triggerActual.trigger}" ON "historial_incidencia"`,
    );
    await db().$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS public."${triggerActual.funcion}"()`,
    );
    triggerActual = undefined;
  });

  afterAll(async () => {
    if (prisma) {
      for (const id of incidenciasCreadas) {
        await db()
          .$executeRaw`DELETE FROM "historial_incidencia" WHERE "incidencia_id" = ${id}::uuid`;
        await db()
          .$executeRaw`DELETE FROM "evidencias_incidencia" WHERE "incidencia_id" = ${id}::uuid`;
        await db()
          .$executeRaw`DELETE FROM "incidencias" WHERE "id" = ${id}::uuid`;
      }
      await db()
        .$executeRaw`DELETE FROM "Unidad" WHERE "id" = ${ids.unidad}::uuid`;
      await db()
        .$executeRaw`DELETE FROM "Seccion" WHERE "id" = ${ids.seccion}::uuid`;
      await db()
        .$executeRaw`DELETE FROM "Torre" WHERE "id" = ${ids.torre}::uuid`;
      await db().$executeRaw`DELETE FROM "users" WHERE "id" IN (
        ${ids.residente}::uuid, ${ids.vecino}::uuid, ${ids.administrador}::uuid,
        ${ids.seguridadA}::uuid, ${ids.seguridadB}::uuid, ${ids.seguridadInactiva}::uuid
      )`;
    }
    await app?.close();
    if (uploadsDir) await rm(uploadsDir, { recursive: true, force: true });
  }, 30_000);

  it('protege listado, catálogo y PATCH por sesión activa y rol', async () => {
    const incidenciaId = await insertarIncidencia();
    await http().get(RUTA).expect(401);
    await http().get(RUTA).set('Authorization', 'Bearer invalido').expect(401);
    await http().get(RUTA).set('Authorization', bearer.expirado).expect(401);
    await http().get(RUTA).set('Authorization', bearer.residente).expect(403);
    await http()
      .get(`${RUTA}/responsables`)
      .set('Authorization', bearer.seguridadA)
      .expect(403);
    await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', bearer.seguridadA)
      .send({ prioridad: 'ALTA' })
      .expect(403);
    await http()
      .get(RUTA)
      .set('Authorization', bearer.seguridadInactiva)
      .expect(401);
    await http().patch(`${RUTA}/bad-id/asignacion`).expect(401);

    await expect(
      http().get(RUTA).set('Authorization', bearer.administrador),
    ).resolves.toMatchObject({ status: 200 });
  });

  it('filtra, ordena y pagina globalmente con proyección mínima', async () => {
    const fechaVieja = new Date('2026-01-01T10:00:00.000Z');
    const fechaNueva = new Date('2026-02-01T10:00:00.000Z');
    const filas = [
      {
        id: '00000000-0000-4000-8000-000000000006',
        prioridad: 'URGENTE' as const,
        createdAt: fechaNueva,
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        prioridad: 'ALTA' as const,
        createdAt: fechaVieja,
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        prioridad: 'ALTA' as const,
        createdAt: fechaNueva,
      },
      {
        id: '00000000-0000-4000-8000-000000000005',
        prioridad: 'MEDIA' as const,
        createdAt: fechaVieja,
      },
      {
        id: '00000000-0000-4000-8000-000000000004',
        prioridad: 'MEDIA' as const,
        createdAt: fechaVieja,
      },
      {
        id: '00000000-0000-4000-8000-000000000001',
        prioridad: 'BAJA' as const,
        createdAt: fechaVieja,
      },
      {
        id: '00000000-0000-4000-8000-000000000007',
        prioridad: null,
        createdAt: fechaVieja,
      },
    ];
    for (const fila of filas) {
      await insertarIncidencia({ ...fila, estado: 'EN_PROCESO' });
    }

    const response = await http()
      .get(RUTA)
      .set('Authorization', bearer.administrador)
      .query({ estado: 'EN_PROCESO', tamanoPagina: 50 })
      .expect(200);
    expect(response.body.datos.map((item: { id: string }) => item.id)).toEqual([
      filas[0]?.id,
      filas[1]?.id,
      filas[2]?.id,
      filas[4]?.id,
      filas[3]?.id,
      filas[5]?.id,
      filas[6]?.id,
    ]);
    expect(response.body).toMatchObject({
      total: 7,
      pagina: 1,
      tamanoPagina: 50,
    });
    expect(Object.keys(response.body.datos[0]).sort()).toEqual(
      [
        'id',
        'codigo',
        'lugar',
        'categoria',
        'creadaAt',
        'prioridad',
        'responsable',
        'estado',
      ].sort(),
    );
    expect(response.body.datos[0]).toMatchObject({
      lugar: `${prefijo}-unidad`,
    });
    expect(new Date(response.body.datos[0].creadaAt).toISOString()).toBe(
      response.body.datos[0].creadaAt,
    );
    expect(response.body.datos[6].prioridad).toBeNull();

    const combinado = await http()
      .get(RUTA)
      .set('Authorization', bearer.administrador)
      .query({ estado: 'EN_PROCESO', prioridad: 'ALTA', tamanoPagina: 50 })
      .expect(200);
    expect(combinado.body.total).toBe(2);
    expect(
      combinado.body.datos.every(
        (item: { prioridad: string }) => item.prioridad === 'ALTA',
      ),
    ).toBe(true);

    for (const query of [
      { estado: 'INVALIDO' },
      { prioridad: '' },
      { pagina: 0 },
      { pagina: -1 },
      { pagina: Math.floor(Number.MAX_SAFE_INTEGER / 50) + 2 },
      { pagina: 'no-numero' },
      { tamanoPagina: 0 },
      { tamanoPagina: 51 },
      { pagina: 1.5 },
      { desconocido: 'x' },
    ]) {
      await http()
        .get(RUTA)
        .set('Authorization', bearer.administrador)
        .query(query)
        .expect(400);
    }
    await http()
      .get(`${RUTA}?estado=ABIERTA&estado=ASIGNADA`)
      .set('Authorization', bearer.administrador)
      .expect(400);
  });

  it('pagina más de veinte filas y conserva el total al consultar la última página', async () => {
    const idsResueltas: string[] = [];
    for (let index = 0; index < 22; index++) {
      idsResueltas.push(
        await insertarIncidencia({ estado: 'RESUELTA', prioridad: 'BAJA' }),
      );
    }

    const primera = await http()
      .get(RUTA)
      .set('Authorization', bearer.administrador)
      .query({ estado: 'RESUELTA' })
      .expect(200);
    const segunda = await http()
      .get(RUTA)
      .set('Authorization', bearer.administrador)
      .query({ estado: 'RESUELTA', pagina: 2 })
      .expect(200);
    const tercera = await http()
      .get(RUTA)
      .set('Authorization', bearer.administrador)
      .query({ estado: 'RESUELTA', pagina: 3 })
      .expect(200);
    const unidad = await http()
      .get(RUTA)
      .set('Authorization', bearer.administrador)
      .query({ estado: 'RESUELTA', tamanoPagina: 1 })
      .expect(200);
    expect(primera.body).toMatchObject({
      total: 22,
      pagina: 1,
      tamanoPagina: 20,
    });
    expect(primera.body.datos).toHaveLength(20);
    expect(segunda.body).toMatchObject({
      total: 22,
      pagina: 2,
      tamanoPagina: 20,
    });
    expect(segunda.body.datos).toHaveLength(2);
    expect(tercera.body).toMatchObject({
      total: 22,
      pagina: 3,
      tamanoPagina: 20,
    });
    expect(tercera.body.datos).toEqual([]);
    expect(unidad.body).toMatchObject({
      total: 22,
      pagina: 1,
      tamanoPagina: 1,
    });
    expect(unidad.body.datos).toHaveLength(1);
    expect(
      [...primera.body.datos, ...segunda.body.datos].map(
        (item: { id: string }) => item.id,
      ),
    ).toEqual(expect.arrayContaining(idsResueltas));
  });

  it('solo cataloga administradores y Seguridad activos y permite recorrer páginas', async () => {
    const primera = await http()
      .get(`${RUTA}/responsables`)
      .set('Authorization', bearer.administrador)
      .query({ tamanoPagina: 2 })
      .expect(200);
    const segunda = await http()
      .get(`${RUTA}/responsables`)
      .set('Authorization', bearer.administrador)
      .query({ pagina: 2, tamanoPagina: 2 })
      .expect(200);

    expect(primera.body.total).toBe(3);
    expect(primera.body.datos).toHaveLength(2);
    expect(segunda.body.datos).toHaveLength(1);
    const todos = [...primera.body.datos, ...segunda.body.datos];
    expect(todos.map((item: { id: string }) => item.id)).toEqual([
      ids.administrador,
      ids.seguridadA,
      ids.seguridadB,
    ]);
    expect(Object.keys(todos[0]).sort()).toEqual(['id', 'nombre']);
    expect(todos.map((item: { nombre: string }) => item.nombre)).toEqual([
      'Aaron administrador',
      'Brenda seguridad',
      'Carlos seguridad',
    ]);
  });

  it('prioriza, asigna, reasigna y registra solo diferencias reales', async () => {
    const prioridadId = await insertarIncidencia();
    const prioridad = await http()
      .patch(`${RUTA}/${prioridadId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ prioridad: 'ALTA' })
      .expect(200);
    expect(prioridad.body).toMatchObject({
      id: prioridadId,
      prioridad: 'ALTA',
      responsable: null,
      estado: 'ABIERTA',
    });
    expect(await contarHistorial(prioridadId)).toBe(2);

    const asignacionId = await insertarIncidencia();
    const asignacion = await http()
      .patch(`${RUTA}/${asignacionId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ responsableId: ids.seguridadA })
      .expect(200);
    expect(asignacion.body).toMatchObject({
      prioridad: null,
      responsable: { id: ids.seguridadA, nombre: 'Brenda seguridad' },
      estado: 'ASIGNADA',
    });
    const historialAsignacion = await leerCambios(asignacionId);
    expect(historialAsignacion.map((item) => item.campo).sort()).toEqual([
      'ESTADO',
      'RESPONSABLE',
    ]);
    expect(
      historialAsignacion.every((item) => item.actorId === ids.administrador),
    ).toBe(true);
    expect(historialAsignacion).toEqual(
      expect.arrayContaining([
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

    const combinadoId = await insertarIncidencia();
    const combinado = await http()
      .patch(`${RUTA}/${combinadoId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ prioridad: 'URGENTE', responsableId: ids.seguridadA })
      .expect(200);
    expect(combinado.body.estado).toBe('ASIGNADA');
    expect(await contarHistorial(combinadoId)).toBe(4);

    const enProcesoId = await insertarIncidencia({
      estado: 'EN_PROCESO',
      prioridad: 'MEDIA',
      responsableId: ids.seguridadA,
    });
    const reasignacion = await http()
      .patch(`${RUTA}/${enProcesoId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ prioridad: 'ALTA', responsableId: ids.seguridadB })
      .expect(200);
    expect(reasignacion.body).toMatchObject({
      prioridad: 'ALTA',
      responsable: { id: ids.seguridadB, nombre: 'Carlos seguridad' },
      estado: 'EN_PROCESO',
    });
    expect(await contarHistorial(enProcesoId)).toBe(5);
  });

  it('rechaza body, identificadores y responsables inválidos sin cambiar la fila', async () => {
    const incidenciaId = await insertarIncidencia();
    const antes = await leerIncidencia(incidenciaId);
    const historiaAntes = await contarHistorial(incidenciaId);
    await http()
      .patch(`${RUTA}/no-es-uuid/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ prioridad: 'ALTA' })
      .expect(400);
    await http()
      .patch(`${RUTA}/${randomUUID()}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ prioridad: 'ALTA' })
      .expect(404);

    const cuerpos: Array<unknown> = [
      {},
      [],
      { prioridad: null },
      { responsableId: null },
      { prioridad: 'INVALIDA' },
      { prioridad: 'ALTA', estado: 'RESUELTA' },
      { actorId: ids.administrador, prioridad: 'ALTA' },
      { prioridad: 'ALTA', residenteId: ids.residente },
    ];
    for (const cuerpo of cuerpos) {
      await http()
        .patch(`${RUTA}/${incidenciaId}/asignacion`)
        .set('Authorization', bearer.administrador)
        .send(cuerpo)
        .expect(400);
    }
    await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .set('Content-Type', 'application/json')
      .send('null')
      .expect(400);

    for (const responsableId of [
      randomUUID(),
      ids.seguridadInactiva,
      ids.residente,
    ]) {
      const respuesta = await http()
        .patch(`${RUTA}/${incidenciaId}/asignacion`)
        .set('Authorization', bearer.administrador)
        .send({ responsableId })
        .expect(400);
      expect(respuesta.body.campo).toBe('responsableId');
    }

    expect(await leerIncidencia(incidenciaId)).toEqual(antes);
    expect(await contarHistorial(incidenciaId)).toBe(historiaAntes);
  });

  it('devuelve 200 sin tocar historial ni updatedAt en reenvío idéntico', async () => {
    const incidenciaId = await insertarIncidencia({
      estado: 'ASIGNADA',
      prioridad: 'ALTA',
      responsableId: ids.seguridadA,
    });
    const antes = await leerIncidencia(incidenciaId);
    const historiaAntes = await contarHistorial(incidenciaId);
    const response = await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ prioridad: 'ALTA', responsableId: ids.seguridadA })
      .expect(200);
    expect(response.body.estado).toBe('ASIGNADA');
    expect(await leerIncidencia(incidenciaId)).toEqual(antes);
    expect(await contarHistorial(incidenciaId)).toBe(historiaAntes);
  });

  it('rechaza cualquier PATCH sobre RESUELTA, incluso valores iguales', async () => {
    const incidenciaId = await insertarIncidencia({
      estado: 'RESUELTA',
      prioridad: 'ALTA',
      responsableId: ids.seguridadA,
    });
    const antes = await leerIncidencia(incidenciaId);
    const historiaAntes = await contarHistorial(incidenciaId);
    for (const body of [
      { prioridad: 'URGENTE' },
      { responsableId: ids.seguridadB },
      { prioridad: 'ALTA', responsableId: ids.seguridadA },
    ]) {
      await http()
        .patch(`${RUTA}/${incidenciaId}/asignacion`)
        .set('Authorization', bearer.administrador)
        .send(body)
        .expect(409);
    }
    expect(await leerIncidencia(incidenciaId)).toEqual(antes);
    expect(await contarHistorial(incidenciaId)).toBe(historiaAntes);
  });

  it('revierte fila e historial cuando falla la última inserción de historial', async () => {
    const incidenciaId = await insertarIncidencia();
    const antes = await leerIncidencia(incidenciaId);
    const historiaAntes = await contarHistorial(incidenciaId);
    const token = randomUUID().replaceAll('-', '');
    triggerActual = {
      trigger: `h10_fail_${token}_trigger`,
      funcion: `h10_fail_${token}_fn`,
    };
    await db().$executeRawUnsafe(`
      CREATE FUNCTION public."${triggerActual.funcion}"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."campo" = 'ESTADO'::"CampoHistorial" THEN
          RAISE EXCEPTION 'h10 forced rollback';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await db().$executeRawUnsafe(`
      CREATE TRIGGER "${triggerActual.trigger}"
      BEFORE INSERT ON "historial_incidencia"
      FOR EACH ROW EXECUTE FUNCTION public."${triggerActual.funcion}"()
    `);

    await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ prioridad: 'URGENTE', responsableId: ids.seguridadA })
      .expect(500);
    expect(await leerIncidencia(incidenciaId)).toEqual(antes);
    expect(await contarHistorial(incidenciaId)).toBe(historiaAntes);
  });

  it('serializa dos solicitudes idénticas desde ABIERTA con una sola transición', async () => {
    const incidenciaId = await insertarIncidencia();
    let liberar!: () => void;
    let adquiriLock!: () => void;
    const barrera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const lockListo = new Promise<void>((resolve) => {
      adquiriLock = resolve;
    });
    const bloqueador = db().$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "incidencias"
        WHERE "id" = ${incidenciaId}::uuid
        FOR UPDATE
      `;
      adquiriLock();
      await barrera;
    });
    await lockListo;
    const peticiones = [1, 2].map(() =>
      http()
        .patch(`${RUTA}/${incidenciaId}/asignacion`)
        .set('Authorization', bearer.administrador)
        .send({ responsableId: ids.seguridadA }),
    );
    const respuestasPromise = Promise.all(peticiones);
    try {
      await esperarConsultasBloqueadas('FOR UPDATE OF i', 2);
    } finally {
      liberar();
    }
    await bloqueador;
    const respuestas = await respuestasPromise;
    expect(respuestas.map((respuesta) => respuesta.status)).toEqual([200, 200]);
    expect(await leerIncidencia(incidenciaId)).toMatchObject({
      estado: 'ASIGNADA',
      responsableId: ids.seguridadA,
    });
    expect(await contarHistorial(incidenciaId)).toBe(3);
  });

  it('conserva cambios concurrentes en campos disjuntos', async () => {
    const incidenciaId = await insertarIncidencia();
    let liberar!: () => void;
    let adquiriLock!: () => void;
    const barrera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const lockListo = new Promise<void>((resolve) => {
      adquiriLock = resolve;
    });
    const bloqueador = db().$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "incidencias"
        WHERE "id" = ${incidenciaId}::uuid
        FOR UPDATE
      `;
      adquiriLock();
      await barrera;
    });
    await lockListo;
    const peticiones = [
      http()
        .patch(`${RUTA}/${incidenciaId}/asignacion`)
        .set('Authorization', bearer.administrador)
        .send({ prioridad: 'ALTA' }),
      http()
        .patch(`${RUTA}/${incidenciaId}/asignacion`)
        .set('Authorization', bearer.administrador)
        .send({ responsableId: ids.seguridadA }),
    ];
    const respuestasPromise = Promise.all(peticiones);
    try {
      await esperarConsultasBloqueadas('FOR UPDATE OF i', 2);
    } finally {
      liberar();
    }
    await bloqueador;
    const respuestas = await respuestasPromise;
    expect(respuestas.map((respuesta) => respuesta.status)).toEqual([200, 200]);
    expect(await leerIncidencia(incidenciaId)).toMatchObject({
      prioridad: 'ALTA',
      estado: 'ASIGNADA',
      responsableId: ids.seguridadA,
    });
    expect(await contarHistorial(incidenciaId)).toBe(4);
  });

  it('espera al bloqueo del candidato y rechaza su desactivación concurrente', async () => {
    const incidenciaId = await insertarIncidencia();
    let liberar!: () => void;
    let adquiriLock!: () => void;
    const barrera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const lockListo = new Promise<void>((resolve) => {
      adquiriLock = resolve;
    });
    const bloqueador = db().$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "users"
        WHERE "id" = ${ids.seguridadB}::uuid
        FOR UPDATE
      `;
      await tx.$executeRaw`
        UPDATE "users" SET "is_active" = false WHERE "id" = ${ids.seguridadB}::uuid
      `;
      adquiriLock();
      await barrera;
    });
    await lockListo;
    const peticion = http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ responsableId: ids.seguridadB });
    const respuestaPromise = peticion.then((response) => response);
    try {
      await esperarConsultasBloqueadas('FOR SHARE', 1);
    } finally {
      liberar();
    }
    await bloqueador;
    try {
      const respuesta = await respuestaPromise;
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.campo).toBe('responsableId');
      expect(await leerIncidencia(incidenciaId)).toMatchObject({
        responsableId: null,
        estado: 'ABIERTA',
      });
    } finally {
      await db().$executeRaw`
        UPDATE "users" SET "is_active" = true WHERE "id" = ${ids.seguridadB}::uuid
      `;
    }
  });

  it('traslada el acceso a evidencia privada al nuevo responsable', async () => {
    const incidenciaId = await insertarIncidencia({
      estado: 'ASIGNADA',
      responsableId: ids.seguridadA,
    });
    const evidenciaId = randomUUID();
    const nombreArchivo = `${evidenciaId}.jpg`;
    if (!uploadsDir) throw new Error('No se preparó el directorio temporal.');
    const directorioEvidencias = join(uploadsDir, 'incidencias');
    await mkdir(directorioEvidencias, { recursive: true });
    await writeFile(
      join(directorioEvidencias, nombreArchivo),
      Buffer.from('h10-evidence'),
    );
    await db().$executeRaw`
      INSERT INTO "evidencias_incidencia" (
        "id", "incidencia_id", "ruta", "mime", "tamano_bytes", "created_at"
      ) VALUES (
        ${evidenciaId}::uuid, ${incidenciaId}::uuid, ${nombreArchivo},
        'image/jpeg', 12, CURRENT_TIMESTAMP
      )
    `;
    const rutaEvidencia = `${RUTA}/${incidenciaId}/evidencias/${evidenciaId}`;
    await http()
      .get(rutaEvidencia)
      .set('Authorization', bearer.seguridadA)
      .expect(200);

    await http()
      .patch(`${RUTA}/${incidenciaId}/asignacion`)
      .set('Authorization', bearer.administrador)
      .send({ responsableId: ids.seguridadB })
      .expect(200);

    await http()
      .get(rutaEvidencia)
      .set('Authorization', bearer.seguridadA)
      .expect(404);
    await http()
      .get(rutaEvidencia)
      .set('Authorization', bearer.seguridadB)
      .expect(200);
    await http()
      .get(rutaEvidencia)
      .set('Authorization', bearer.residente)
      .expect(200);
    await http()
      .get(rutaEvidencia)
      .set('Authorization', bearer.administrador)
      .expect(200);
    await http()
      .get(rutaEvidencia)
      .set('Authorization', bearer.vecino)
      .expect(404);
  });
});
