import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import type { PrismaService as Db } from '../src/prisma/services/prisma.service.js';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test'))
  throw new Error('Se requiere una base aislada _test');
describe.skipIf(!url)('H24 audiencia y lecturas HTTP/PostgreSQL', () => {
  let app: INestApplication;
  let db: Db;
  const ids = {
    admin: randomUUID(),
    multi: randomUUID(),
    vecino: randomUUID(),
    sinUnidad: randomUUID(),
    seguridad: randomUUID(),
    torreA: randomUUID(),
    torreB: randomUUID(),
    seccionA: randomUUID(),
    seccionB: randomUUID(),
    otraSeccion: randomUUID(),
    unidadA: randomUUID(),
    unidadB: randomUUID(),
    otraUnidad: randomUUID(),
  };
  const tokens: Record<string, string> = {};
  const avisos: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const get = (path: string, token = tokens.multi) =>
    http().get(`/api/v1/comunicados/${path}`).set('Authorization', token);
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'comunicados-pruebas-aisladas-2026-clave-larga';
    const { AppModule } = await import('../dist/app.module.js');
    const { PrismaService } =
      await import('../dist/prisma/services/prisma.service.js');
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    const jwt = app.get(JwtService);
    for (const nombre of [
      'admin',
      'multi',
      'vecino',
      'sinUnidad',
      'seguridad',
    ] as const) {
      const u = await db.user.create({
        data: {
          id: ids[nombre],
          email: `${ids[nombre]}@test.invalid`,
          passwordHash: 'test',
          nombre,
          rol:
            nombre === 'admin'
              ? 'ADMINISTRADOR'
              : nombre === 'seguridad'
                ? 'SEGURIDAD'
                : 'RESIDENTE',
        },
      });
      tokens[nombre] = `Bearer ${jwt.sign({ sub: u.id, email: u.email })}`;
    }
    await db.torre.createMany({
      data: [
        { id: ids.torreA, nombre: `A-${ids.torreA.slice(0, 8)}` },
        { id: ids.torreB, nombre: `B-${ids.torreB.slice(0, 8)}` },
      ],
    });
    await db.seccion.createMany({
      data: [
        { id: ids.seccionA, torreId: ids.torreA, nombre: 'Norte' },
        { id: ids.seccionB, torreId: ids.torreB, nombre: 'Norte' },
        { id: ids.otraSeccion, torreId: ids.torreA, nombre: 'Sur' },
      ],
    });
    await db.unidad.createMany({
      data: [
        {
          id: ids.unidadA,
          codigo: ids.unidadA,
          torreId: ids.torreA,
          seccionId: ids.seccionA,
          cuotaMensual: 50,
        },
        {
          id: ids.unidadB,
          codigo: ids.unidadB,
          torreId: ids.torreB,
          seccionId: ids.seccionB,
          cuotaMensual: 50,
        },
        {
          id: ids.otraUnidad,
          codigo: ids.otraUnidad,
          torreId: ids.torreA,
          seccionId: ids.otraSeccion,
          cuotaMensual: 50,
        },
      ],
    });
    await db.usuarioUnidad.createMany({
      data: [
        { userId: ids.multi, unidadId: ids.unidadA },
        { userId: ids.multi, unidadId: ids.unidadB },
        { userId: ids.vecino, unidadId: ids.otraUnidad },
      ],
    });
    for (const [nombre, alcance, torreId, seccionId] of [
      ['general', 'TODOS', null, null],
      ['torreA', 'TORRE', ids.torreA, null],
      ['torreB', 'TORRE', ids.torreB, null],
      ['seccionA', 'SECCION', null, ids.seccionA],
      ['seccionB', 'SECCION', null, ids.seccionB],
      ['privado', 'SECCION', null, ids.otraSeccion],
    ] as const) {
      const c = await db.comunicado.create({
        data: {
          titulo: `Aviso ${nombre}`,
          contenido: 'Texto completo <script>alert(1)</script>',
          alcance,
          torreId,
          seccionId,
          autorId: ids.admin,
          createdAt: new Date('2000-01-01T12:00:00Z'),
        },
      });
      avisos[nombre] = c.id;
    }
  }, 30000);
  afterAll(async () => {
    if (db) {
      await db.lecturaComunicado.deleteMany({
        where: { comunicado: { autorId: ids.admin } },
      });
      await db.comunicado.deleteMany({ where: { autorId: ids.admin } });
      await db.usuarioUnidad.deleteMany({
        where: { userId: { in: [ids.multi, ids.vecino] } },
      });
      await db.unidad.deleteMany({
        where: { id: { in: [ids.unidadA, ids.unidadB, ids.otraUnidad] } },
      });
      await db.seccion.deleteMany({
        where: { id: { in: [ids.seccionA, ids.seccionB, ids.otraSeccion] } },
      });
      await db.torre.deleteMany({
        where: { id: { in: [ids.torreA, ids.torreB] } },
      });
      await db.user.deleteMany({
        where: {
          id: {
            in: [
              ids.admin,
              ids.multi,
              ids.vecino,
              ids.sinUnidad,
              ids.seguridad,
            ],
          },
        },
      });
    }
    await app?.close();
  });
  it('combina todas las unidades, sin duplicados ni filtro por ingreso', async () => {
    const r = await get('mios').expect(200);
    expect(r.body.total).toBe(5);
    expect(new Set(r.body.datos.map((c: { id: string }) => c.id)).size).toBe(5);
    expect(r.body.datos.map((c: { id: string }) => c.id).sort()).toEqual(
      ['general', 'torreA', 'torreB', 'seccionA', 'seccionB']
        .map((k) => avisos[k])
        .sort(),
    );
    expect(r.body.datos[0].contenido).toBeUndefined();
    expect(
      r.body.datos.every((c: { leido: boolean }) => c.leido === false),
    ).toBe(true);
    expect(
      await db.lecturaComunicado.count({ where: { userId: ids.multi } }),
    ).toBe(0);
  });
  it('no revela ni registra lecturas de otro alcance por URL', async () => {
    await get(avisos.privado).expect(404);
    await get(randomUUID()).expect(404);
    expect(
      await db.lecturaComunicado.count({
        where: { userId: ids.multi, comunicadoId: avisos.privado },
      }),
    ).toBe(0);
    await get(avisos.seccionA, tokens.vecino).expect(404);
    await get(avisos.privado, tokens.vecino).expect(200);
  });
  it('detalle registra una sola lectura aun con diez accesos concurrentes', async () => {
    const respuestas = await Promise.all(
      Array.from({ length: 10 }, () => get(avisos.general)),
    );
    expect(respuestas.map((r) => r.status)).toEqual(Array(10).fill(200));
    expect(respuestas[0].body).toMatchObject({
      id: avisos.general,
      contenido: 'Texto completo <script>alert(1)</script>',
      alcance: 'TODOS',
    });
    const lecturas = await db.lecturaComunicado.findMany({
      where: { userId: ids.multi, comunicadoId: avisos.general },
    });
    expect(lecturas).toHaveLength(1);
    await get(avisos.general).expect(200);
    expect(
      (
        await db.lecturaComunicado.findUniqueOrThrow({
          where: { id: lecturas[0].id },
        })
      ).leidoAt,
    ).toEqual(lecturas[0].leidoAt);
    expect(
      (await get('mios')).body.datos.find(
        (c: { id: string }) => c.id === avisos.general,
      ).leido,
    ).toBe(true);
    const admin = await get('administracion', tokens.admin).expect(200);
    expect(
      admin.body.datos.find((c: { id: string }) => c.id === avisos.general),
    ).toMatchObject({ leidoPor: 1, destinatarios: 3 });
  });
  it('no usa parámetros manipulados para ampliar audiencia; valida página, uuid y rol', async () => {
    for (const query of [
      `userId=${ids.vecino}`,
      `torreId=${ids.torreA}`,
      'pagina=0',
      'tamanoPagina=51',
      'pagina=1.5',
    ])
      await get(`mios?${query}`).expect(400);
    await get('uuid-invalido').expect(400);
    await http().get('/api/v1/comunicados/mios').expect(401);
    for (const token of [tokens.admin, tokens.seguridad]) {
      await get('mios', token).expect(403);
      await get(avisos.general, token).expect(403);
    }
  });
  it('residentes sin unidad ven solo los generales y el vacío respeta el contrato', async () => {
    const r = await get('mios', tokens.sinUnidad).expect(200);
    expect(r.body.total).toBe(1);
    expect(r.body.datos[0].id).toBe(avisos.general);
    await get(avisos.torreA, tokens.sinUnidad).expect(404);
    expect((await get('mios?pagina=2', tokens.sinUnidad)).body.datos).toEqual(
      [],
    );
  });
  it('pagina de diez en diez con orden estable por publicación e id', async () => {
    for (let i = 0; i < 11; i++)
      await db.comunicado.create({
        data: {
          autorId: ids.admin,
          titulo: `Nuevo aviso ${i}`,
          contenido: 'Contenido',
          alcance: 'TODOS',
          createdAt: new Date(
            `2026-11-11T12:00:${String(i).padStart(2, '0')}Z`,
          ),
        },
      });
    const primera = (await get('mios')).body;
    const segunda = (await get('mios?pagina=2')).body;
    expect(primera.datos).toHaveLength(10);
    expect(segunda.datos).toHaveLength(6);
    expect(primera.datos[0].titulo).toBe('Nuevo aviso 10');
    expect(
      new Set(
        [...primera.datos, ...segunda.datos].map((c: { id: string }) => c.id),
      ).size,
    ).toBe(16);
    expect(
      (await get('mios?pagina=2')).body.datos.map((c: { id: string }) => c.id),
    ).toEqual(segunda.datos.map((c: { id: string }) => c.id));
  });
});
