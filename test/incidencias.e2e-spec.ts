import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
if (url) {
  const database = decodeURIComponent(
    new URL(url).pathname.split('/').pop() ?? '',
  );
  if (!database.endsWith('_test')) {
    throw new Error(
      'TEST_DATABASE_URL debe apuntar a una base aislada con sufijo _test; no se ejecutará ninguna prueba.',
    );
  }
}

const RUTA = '/api/v1/incidencias';
const prefijo = `h9-${randomUUID()}`;
const ids = {
  residente: randomUUID(),
  vecino: randomUUID(),
  ajeno: randomUUID(),
  eliminado: randomUUID(),
  administrador: randomUUID(),
  seguridad: randomUUID(),
  inactivo: randomUUID(),
  unidad: randomUUID(),
  unidadAjena: randomUUID(),
  torre: randomUUID(),
  seccion: randomUUID(),
  area: randomUUID(),
  areaInactiva: randomUUID(),
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
};

describe.skipIf(!url)('H9 HTTP + PostgreSQL real aislado', () => {
  let app: INestApplication;
  let prisma: SqlClient;
  let residente: string;
  let vecino: string;
  let administrador: string;
  let seguridad: string;
  let inactivo: string;
  let eliminado: string;
  let tokenExpirado: string;
  let jpeg: Buffer;
  let png: Buffer;
  let jpeg5MiB: Buffer;
  let uploadsDir: string;
  const incidenciasCreadas: string[] = [];
  let triggerActual:
    | {
        nombre: string;
        tabla: 'evidencias_incidencia' | 'historial_incidencia';
      }
    | undefined;

  const http = () => request(app.getHttpServer());
  const crear = (token = residente, unidadId = ids.unidad) =>
    http()
      .post(RUTA)
      .set('Authorization', token)
      .field('lugarTipo', 'UNIDAD')
      .field('unidadId', unidadId)
      .field('categoria', 'FUGA')
      .field('descripcion', 'Hay una fuga importante de agua');
  const insertarUsuario = async (
    id: string,
    rol: 'RESIDENTE' | 'ADMINISTRADOR' | 'SEGURIDAD',
    nombre: string,
    activo = true,
  ) => {
    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "email", "password_hash", "is_active", "rol", "nombre", "updated_at")
      VALUES (${id}::uuid, ${`${prefijo}-${nombre}@condominio.test`}, 'hash-de-prueba', ${activo}, ${rol}::"Rol", ${nombre}, CURRENT_TIMESTAMP)
    `;
  };

  beforeAll(async () => {
    if (!url)
      throw new Error('TEST_DATABASE_URL es obligatorio para la suite H9.');
    uploadsDir = await mkdtemp(join(tmpdir(), 'h9-e2e-uploads-'));
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'clave-aislada-exclusiva-pruebas-h9-2026';
    process.env.NODE_ENV = 'test';
    process.env.UPLOADS_DIR = uploadsDir;

    const imagen = {
      create: {
        width: 2,
        height: 2,
        channels: 3 as const,
        background: '#3478bf',
      },
    };
    jpeg = await sharp(imagen).jpeg().toBuffer();
    png = await sharp(imagen).png().toBuffer();
    jpeg5MiB = agregarComentariosJpegHasta(jpeg, 5_242_880);

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

    for (const [id, rol, nombre, activo] of [
      [ids.residente, 'RESIDENTE', 'residente', true],
      [ids.vecino, 'RESIDENTE', 'vecino', true],
      [ids.ajeno, 'RESIDENTE', 'ajeno', true],
      [ids.eliminado, 'RESIDENTE', 'eliminado', true],
      [ids.administrador, 'ADMINISTRADOR', 'administrador', true],
      [ids.seguridad, 'SEGURIDAD', 'seguridad', true],
      [ids.inactivo, 'RESIDENTE', 'inactivo', false],
    ] as const) {
      await insertarUsuario(id, rol, nombre, activo);
    }

    await prisma.$executeRaw`
      INSERT INTO "Torre" ("id", "nombre") VALUES (${ids.torre}::uuid, ${`${prefijo.slice(0, 20)}-torre`})
    `;
    await prisma.$executeRaw`
      INSERT INTO "Seccion" ("id", "nombre", "torreId") VALUES (${ids.seccion}::uuid, 'Norte', ${ids.torre}::uuid)
    `;
    for (const [unidadId, suffix] of [
      [ids.unidad, 'propia'],
      [ids.unidadAjena, 'ajena'],
    ] as const) {
      await prisma.$executeRaw`
        INSERT INTO "Unidad" ("id", "codigo", "torreId", "seccionId", "cuotaMensual")
        VALUES (${unidadId}::uuid, ${`${prefijo}-${suffix}`}, ${ids.torre}::uuid, ${ids.seccion}::uuid, 50.00)
      `;
    }
    for (const [usuarioId, unidadId] of [
      [ids.residente, ids.unidad],
      [ids.vecino, ids.unidad],
      [ids.ajeno, ids.unidadAjena],
    ]) {
      await prisma.$executeRaw`
        INSERT INTO "UsuarioUnidad" ("id", "userId", "unidadId")
        VALUES (${randomUUID()}::uuid, ${usuarioId}::uuid, ${unidadId}::uuid)
      `;
    }
    await prisma.$executeRaw`
      INSERT INTO "AreaComun" ("id", "nombre", "capacidad", "activa", "updatedAt")
      VALUES (${ids.area}::uuid, ${`${prefijo}-area`}, 20, true, CURRENT_TIMESTAMP),
             (${ids.areaInactiva}::uuid, ${`${prefijo}-inactiva`}, 20, false, CURRENT_TIMESTAMP)
    `;

    const jwt = app.get(JwtService);
    const token = (id: string, name: string, expiresIn?: number) => {
      const payload = { sub: id, email: `${prefijo}-${name}@condominio.test` };
      return `Bearer ${expiresIn === undefined ? jwt.sign(payload) : jwt.sign(payload, { expiresIn })}`;
    };
    residente = token(ids.residente, 'residente');
    vecino = token(ids.vecino, 'vecino');
    administrador = token(ids.administrador, 'administrador');
    seguridad = token(ids.seguridad, 'seguridad');
    inactivo = token(ids.inactivo, 'inactivo');
    eliminado = token(ids.eliminado, 'eliminado');
    tokenExpirado = token(ids.residente, 'residente', -1);
    await prisma.$executeRaw`DELETE FROM "users" WHERE "id" = ${ids.eliminado}::uuid`;
  }, 60_000);

  afterAll(async () => {
    if (prisma) {
      if (triggerActual) {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS ${triggerActual.nombre} ON "${triggerActual.tabla}"`,
        );
        await prisma.$executeRawUnsafe(
          `DROP FUNCTION IF EXISTS public.${triggerActual.nombre}()`,
        );
      }
      for (const incidenciaId of incidenciasCreadas) {
        await prisma.$executeRaw`DELETE FROM "historial_incidencia" WHERE "incidencia_id" = ${incidenciaId}::uuid`;
        await prisma.$executeRaw`DELETE FROM "evidencias_incidencia" WHERE "incidencia_id" = ${incidenciaId}::uuid`;
        await prisma.$executeRaw`DELETE FROM "incidencias" WHERE "id" = ${incidenciaId}::uuid`;
      }
      await prisma.$executeRaw`DELETE FROM "UsuarioUnidad" WHERE "userId" IN (${ids.residente}::uuid, ${ids.vecino}::uuid, ${ids.ajeno}::uuid)`;
      await prisma.$executeRaw`DELETE FROM "Unidad" WHERE "id" IN (${ids.unidad}::uuid, ${ids.unidadAjena}::uuid)`;
      await prisma.$executeRaw`DELETE FROM "Seccion" WHERE "id" = ${ids.seccion}::uuid`;
      await prisma.$executeRaw`DELETE FROM "Torre" WHERE "id" = ${ids.torre}::uuid`;
      await prisma.$executeRaw`DELETE FROM "AreaComun" WHERE "id" IN (${ids.area}::uuid, ${ids.areaInactiva}::uuid)`;
      await prisma.$executeRaw`DELETE FROM "users" WHERE "id" IN (${ids.residente}::uuid, ${ids.vecino}::uuid, ${ids.ajeno}::uuid, ${ids.eliminado}::uuid, ${ids.administrador}::uuid, ${ids.seguridad}::uuid, ${ids.inactivo}::uuid)`;
    }
    await app?.close();
    if (uploadsDir) await rm(uploadsDir, { recursive: true, force: true });
  }, 30_000);

  it('requiere sesión activa y restringe POST a residentes antes de procesar fotos', async () => {
    await http().post(RUTA).field('lugarTipo', 'UNIDAD').expect(401);
    await http().post(RUTA).set('Authorization', 'Bearer invalido').expect(401);
    await http().post(RUTA).set('Authorization', tokenExpirado).expect(401);
    await crear(inactivo)
      .attach('fotos', jpeg, {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      })
      .expect(401);
    await crear(eliminado).expect(401);
    await crear(administrador)
      .attach('fotos', jpeg, {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      })
      .expect(403);
    await crear(seguridad)
      .attach('fotos', jpeg, {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      })
      .expect(403);
  });

  it('valida descripción, lugar, autoría y área común antes de crear filas', async () => {
    await http()
      .post(RUTA)
      .set('Authorization', residente)
      .field('lugarTipo', 'UNIDAD')
      .field('unidadId', ids.unidad)
      .field('categoria', 'FUGA')
      .field('descripcion', 'corta')
      .expect(400);
    await crear(residente, ids.unidadAjena).expect(403);
    await http()
      .post(RUTA)
      .set('Authorization', residente)
      .field('lugarTipo', 'UNIDAD')
      .field('unidadId', 'not-a-uuid')
      .field('categoria', 'FUGA')
      .field('descripcion', 'Hay una fuga importante de agua')
      .expect(400);
    await http()
      .post(RUTA)
      .set('Authorization', residente)
      .field('lugarTipo', 'UNIDAD')
      .field('unidadId', randomUUID())
      .field('categoria', 'FUGA')
      .field('descripcion', 'Hay una fuga importante de agua')
      .expect(404);
    await http()
      .post(RUTA)
      .set('Authorization', residente)
      .field('lugarTipo', 'AREA_COMUN')
      .field('areaId', randomUUID())
      .field('categoria', 'FUGA')
      .field('descripcion', 'Hay una fuga importante de agua')
      .expect(404);
    await crear(residente).field('areaId', ids.area).expect(400);
    for (const campo of [
      'residenteId',
      'actorId',
      'codigo',
      'estado',
      'prioridad',
      'responsableId',
    ]) {
      await crear(residente).field(campo, ids.ajeno).expect(400);
    }
    await http()
      .post(RUTA)
      .set('Authorization', residente)
      .field('lugarTipo', 'AREA_COMUN')
      .field('areaId', ids.areaInactiva)
      .field('categoria', 'FUGA')
      .field('descripcion', 'Hay una fuga importante de agua')
      .expect(400);

    const response = await http()
      .post(RUTA)
      .set('Authorization', residente)
      .field('lugarTipo', 'AREA_COMUN')
      .field('areaId', ids.area)
      .field('categoria', 'OTRO')
      .field('descripcion', 'Falta una señal informativa aquí')
      .expect(201);
    incidenciasCreadas.push(response.body.id as string);
    const [row] = await prisma.$queryRaw<
      Array<{ residente_id: string; lugar_tipo: string }>
    >`
      SELECT "residente_id"::text, "lugar_tipo"::text
      FROM "incidencias" WHERE "id" = ${response.body.id}::uuid
    `;
    expect(row).toEqual({
      residente_id: ids.residente,
      lugar_tipo: 'AREA_COMUN',
    });
  });

  it('acepta descripciones de 10 y 500 caracteres y las seis categorías', async () => {
    for (const descripcion of [
      'á'.repeat(10),
      'Incidencia ' + 'x'.repeat(489),
    ]) {
      const response = await http()
        .post(RUTA)
        .set('Authorization', residente)
        .field('lugarTipo', 'UNIDAD')
        .field('unidadId', ids.unidad)
        .field('categoria', 'OTRO')
        .field('descripcion', descripcion)
        .expect(201);
      incidenciasCreadas.push(response.body.id as string);
    }
    await http()
      .post(RUTA)
      .set('Authorization', residente)
      .field('lugarTipo', 'UNIDAD')
      .field('unidadId', ids.unidad)
      .field('categoria', 'OTRO')
      .field('descripcion', 'x'.repeat(501))
      .expect(400);

    for (const categoria of [
      'FUGA',
      'ELECTRICIDAD',
      'ASCENSOR',
      'LIMPIEZA',
      'SEGURIDAD',
      'OTRO',
    ]) {
      const response = await http()
        .post(RUTA)
        .set('Authorization', residente)
        .field('lugarTipo', 'UNIDAD')
        .field('unidadId', ids.unidad)
        .field('categoria', categoria)
        .field('descripcion', 'Incidencia de prueba en el edificio')
        .expect(201);
      incidenciasCreadas.push(response.body.id as string);
    }
    await http()
      .post(RUTA)
      .set('Authorization', residente)
      .field('lugarTipo', 'UNIDAD')
      .field('unidadId', ids.unidad)
      .field('categoria', 'CATEGORIA_INVALIDA')
      .field('descripcion', 'Incidencia de prueba en el edificio')
      .expect(400);
  });

  it('acepta dos y tres fotos JPEG/PNG válidas', async () => {
    for (const cantidad of [2, 3]) {
      let envio = crear();
      for (let i = 0; i < cantidad; i++) {
        envio = envio.attach('fotos', i % 2 === 0 ? jpeg : png, {
          filename: i % 2 === 0 ? `${i}.jpg` : `${i}.png`,
          contentType: i % 2 === 0 ? 'image/jpeg' : 'image/png',
        }) as typeof envio;
      }
      const response = await envio.expect(201);
      incidenciasCreadas.push(response.body.id as string);
      expect(response.body.evidencias).toHaveLength(cantidad);
    }
  });

  it('crea unidad propia con evidencia y persiste un único historial ABIERTA', async () => {
    const response = await crear()
      .attach('fotos', jpeg, {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    incidenciasCreadas.push(response.body.id as string);

    expect(Object.keys(response.body).sort()).toEqual(
      ['id', 'codigo', 'estado', 'categoria', 'creadaAt', 'evidencias'].sort(),
    );
    expect(response.body).toMatchObject({
      codigo: expect.stringMatching(/^INC-\d{4,}$/),
      estado: 'ABIERTA',
      categoria: 'FUGA',
    });
    expect(new Date(response.body.creadaAt).toISOString()).toBe(
      response.body.creadaAt,
    );
    expect(response.body.evidencias).toHaveLength(1);
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(uploadsDir);
    const evidencia = response.body.evidencias[0] as {
      id: string;
      url: string;
    };
    expect(evidencia.url).toBe(
      `${RUTA}/${response.body.id}/evidencias/${evidencia.id}`,
    );

    const historial = await prisma.$queryRaw<
      Array<{ total: bigint; valor_nuevo: string; actor_id: string }>
    >`
      SELECT count(*) AS total, min("valor_nuevo") AS valor_nuevo, min("actor_id"::text) AS actor_id
      FROM "historial_incidencia" WHERE "incidencia_id" = ${response.body.id}::uuid
    `;
    expect(Number(historial[0]?.total)).toBe(1);
    expect(historial[0]?.valor_nuevo).toBe('ABIERTA');
    expect(historial[0]?.actor_id).toBe(ids.residente);
  });

  it('acepta exactamente 5 MiB válidos y rechaza 5 MiB más un byte', async () => {
    const accepted = await crear()
      .attach('fotos', jpeg5MiB, {
        filename: 'exacto.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    incidenciasCreadas.push(accepted.body.id as string);

    await crear()
      .attach('fotos', Buffer.concat([jpeg5MiB, Buffer.from([0])]), {
        filename: 'grande.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
  }, 30_000);

  it('rechaza contenido falso, el cuarto archivo y nombres de campo de archivo alternos', async () => {
    await crear()
      .attach('fotos', Buffer.from('%PDF-1.7'), {
        filename: 'documento.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    await crear()
      .attach('fotos', jpeg, { filename: '1.jpg', contentType: 'image/jpeg' })
      .attach('fotos', png, { filename: '2.png', contentType: 'image/png' })
      .attach('fotos', jpeg, { filename: '3.jpg', contentType: 'image/jpeg' })
      .attach('fotos', jpeg, { filename: '4.jpg', contentType: 'image/jpeg' })
      .expect(400);
    await crear()
      .attach('archivo', jpeg, { filename: '1.jpg', contentType: 'image/jpeg' })
      .expect(400);
  });

  it('asigna códigos únicos y crea historial para veinte solicitudes concurrentes', async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => crear().expect(201)),
    );
    const idsCreados = responses.map((response) => response.body.id as string);
    incidenciasCreadas.push(...idsCreados);
    expect(new Set(idsCreados).size).toBe(20);
    expect(
      new Set(responses.map((response) => response.body.codigo)).size,
    ).toBe(20);

    for (const incidenciaId of idsCreados) {
      const [row] = await prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT count(*) AS total FROM "historial_incidencia" WHERE "incidencia_id" = ${incidenciaId}::uuid AND "valor_nuevo" = 'ABIERTA'
      `;
      expect(Number(row?.total)).toBe(1);
    }
  }, 60_000);

  it('compensa archivos y filas si fallan las inserciones de evidencia o historial', async () => {
    const [before] = await prisma.$queryRaw<
      Array<{ incidencias: bigint; evidencias: bigint; historiales: bigint }>
    >`
      SELECT
        (SELECT count(*) FROM "incidencias" WHERE "residente_id" = ${ids.residente}::uuid) AS incidencias,
        (SELECT count(*) FROM "evidencias_incidencia" e JOIN "incidencias" i ON i."id" = e."incidencia_id" WHERE i."residente_id" = ${ids.residente}::uuid) AS evidencias,
        (SELECT count(*) FROM "historial_incidencia" h JOIN "incidencias" i ON i."id" = h."incidencia_id" WHERE i."residente_id" = ${ids.residente}::uuid) AS historiales
    `;
    const filesBefore = await readdir(join(uploadsDir, 'incidencias')).catch(
      () => [] as string[],
    );

    for (const tabla of [
      'evidencias_incidencia',
      'historial_incidencia',
    ] as const) {
      const nombre = `h9_falla_${randomUUID().replaceAll('-', '')}`;
      triggerActual = { nombre, tabla };
      const funcion = `CREATE FUNCTION public.${nombre}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo de prueba H9'; END; $$`;
      await prisma.$executeRawUnsafe(funcion);
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER ${nombre} BEFORE INSERT ON "${tabla}" FOR EACH ROW EXECUTE FUNCTION public.${nombre}()`,
      );
      await crear()
        .attach('fotos', jpeg, {
          filename: 'rollback.jpg',
          contentType: 'image/jpeg',
        })
        .expect(500);
      const [counts] = await prisma.$queryRaw<
        Array<{ incidencias: bigint; evidencias: bigint; historiales: bigint }>
      >`
        SELECT
          (SELECT count(*) FROM "incidencias" WHERE "residente_id" = ${ids.residente}::uuid) AS incidencias,
          (SELECT count(*) FROM "evidencias_incidencia" e JOIN "incidencias" i ON i."id" = e."incidencia_id" WHERE i."residente_id" = ${ids.residente}::uuid) AS evidencias,
          (SELECT count(*) FROM "historial_incidencia" h JOIN "incidencias" i ON i."id" = h."incidencia_id" WHERE i."residente_id" = ${ids.residente}::uuid) AS historiales
      `;
      const filesAfter = await readdir(join(uploadsDir, 'incidencias')).catch(
        () => [] as string[],
      );
      expect(filesAfter.sort()).toEqual(filesBefore.sort());
      expect(counts).toEqual(before);

      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS ${nombre} ON "${tabla}"`,
      );
      await prisma.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS public.${nombre}()`,
      );
      triggerActual = undefined;
    }
  });

  it('amplía el correlativo de cuatro a más dígitos en la base de prueba', async () => {
    const [secuencia] = await prisma.$queryRaw<
      Array<{ last_value: bigint; is_called: boolean }>
    >`SELECT last_value, is_called FROM public.incidencias_codigo_seq`;
    if (!secuencia) throw new Error('No se pudo leer la secuencia de H9.');

    try {
      await prisma.$queryRaw`SELECT setval('public.incidencias_codigo_seq', 9999, true)`;
      const response = await crear().expect(201);
      incidenciasCreadas.push(response.body.id as string);
      expect(response.body.codigo).toBe('INC-10000');
    } finally {
      await prisma.$queryRaw`
        SELECT setval('public.incidencias_codigo_seq', ${secuencia.last_value}, ${secuencia.is_called})
      `;
    }
  });

  it('autoriza lectura privada solo al autor, administrador y Seguridad asignada', async () => {
    const created = await crear()
      .attach('fotos', png, {
        filename: 'privada.png',
        contentType: 'image/png',
      })
      .expect(201);
    const incidenciaId = created.body.id as string;
    incidenciasCreadas.push(incidenciaId);
    const evidencia = created.body.evidencias[0] as { id: string; url: string };
    const another = await crear()
      .attach('fotos', jpeg, {
        filename: 'otra.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    incidenciasCreadas.push(another.body.id as string);
    const otraEvidencia = another.body.evidencias[0] as {
      id: string;
      url: string;
    };

    await http().get(evidencia.url).expect(401);
    const autor = await http()
      .get(evidencia.url)
      .set('Authorization', residente)
      .expect(200);
    expect(autor.headers['content-type']).toContain('image/png');
    expect(autor.headers['content-disposition']).toContain('inline');
    expect(autor.headers['x-content-type-options']).toBe('nosniff');
    expect(autor.headers['cache-control']).toContain('private');
    await http()
      .get(evidencia.url)
      .set('Authorization', administrador)
      .expect(200);
    await http().get(evidencia.url).set('Authorization', vecino).expect(404);
    await http().get(evidencia.url).set('Authorization', seguridad).expect(404);
    const [evidenciaDb] = await prisma.$queryRaw<Array<{ ruta: string }>>`
      SELECT "ruta" FROM "evidencias_incidencia" WHERE "id" = ${evidencia.id}::uuid
    `;
    await http()
      .get(`/uploads/incidencias/${evidenciaDb?.ruta}`)
      .set('Authorization', residente)
      .expect(404);
    await http()
      .get(`${RUTA}/${incidenciaId}/evidencias/${otraEvidencia.id}`)
      .set('Authorization', administrador)
      .expect(404);

    await prisma.$executeRaw`
      UPDATE "incidencias" SET "responsable_id" = ${ids.seguridad}::uuid WHERE "id" = ${incidenciaId}::uuid
    `;
    await http().get(evidencia.url).set('Authorization', seguridad).expect(200);
    await http()
      .get(`${RUTA}/${randomUUID()}/evidencias/${evidencia.id}`)
      .set('Authorization', administrador)
      .expect(404);
    await http()
      .get(`${RUTA}/${incidenciaId}/evidencias/${randomUUID()}`)
      .set('Authorization', administrador)
      .expect(404);
    await http()
      .get(`${RUTA}/no-es-uuid/evidencias/${evidencia.id}`)
      .set('Authorization', administrador)
      .expect(400);
  });
});

function agregarComentariosJpegHasta(buffer: Buffer, tamano: number): Buffer {
  let restante = tamano - buffer.length;
  if (restante < 4) throw new Error('No hay espacio para un segmento JPEG.');
  const segmentos: Buffer[] = [];
  while (restante > 0) {
    let tamanoSegmento = Math.min(65_537, restante);
    if (restante - tamanoSegmento > 0 && restante - tamanoSegmento < 4) {
      tamanoSegmento -= 4 - (restante - tamanoSegmento);
    }
    const segmento = Buffer.alloc(tamanoSegmento);
    segmento[0] = 0xff;
    segmento[1] = 0xfe;
    segmento.writeUInt16BE(tamanoSegmento - 2, 2);
    segmentos.push(segmento);
    restante -= tamanoSegmento;
  }
  return Buffer.concat([
    buffer.subarray(0, 2),
    ...segmentos,
    buffer.subarray(2),
  ]);
}
