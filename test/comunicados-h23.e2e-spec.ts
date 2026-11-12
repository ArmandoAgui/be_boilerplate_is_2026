import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import type { PrismaService as Db } from '../src/prisma/services/prisma.service.js';
import type { NotificacionesService as ServicioNotificaciones } from '../src/notificaciones/services/notificaciones.service.js';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test'))
  throw new Error('Se requiere una base aislada _test');
describe.skipIf(!url)('H23 HTTP y PostgreSQL', () => {
  let app: INestApplication;
  let db: Db;
  let notificaciones: ServicioNotificaciones;
  const ids = {
    admin: randomUUID(),
    residente: randomUUID(),
    vecino: randomUUID(),
    otro: randomUUID(),
    inactivo: randomUUID(),
    seguridad: randomUUID(),
    torre: randomUUID(),
    torre2: randomUUID(),
    seccion: randomUUID(),
    seccion2: randomUUID(),
    unidad: randomUUID(),
    unidad2: randomUUID(),
  };
  const tokens: Record<string, string> = {};
  const comunicados: string[] = [];
  const http = () => request(app.getHttpServer());
  const body = (extra: Record<string, unknown> = {}) => ({
    titulo: 'Aviso oficial',
    contenido: 'Contenido del aviso',
    alcance: 'TODOS',
    ...extra,
  });
  const publicar = (data = body(), token = tokens.admin) =>
    http().post('/api/v1/comunicados').set('Authorization', token).send(data);
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'comunicados-pruebas-aisladas-2026-clave-larga';
    const { AppModule } = await import('../dist/app.module.js');
    const { PrismaService } =
      await import('../dist/prisma/services/prisma.service.js');
    const { NotificacionesService } =
      await import('../dist/notificaciones/services/notificaciones.service.js');
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
    notificaciones = app.get(NotificacionesService);
    const jwt = app.get(JwtService);
    for (const nombre of [
      'admin',
      'residente',
      'vecino',
      'otro',
      'inactivo',
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
          isActive: nombre !== 'inactivo',
        },
      });
      tokens[nombre] = `Bearer ${jwt.sign({ sub: u.id, email: u.email })}`;
    }
    await db.torre.createMany({
      data: [
        { id: ids.torre, nombre: `A-${ids.torre.slice(0, 8)}` },
        { id: ids.torre2, nombre: `B-${ids.torre2.slice(0, 8)}` },
      ],
    });
    await db.seccion.createMany({
      data: [
        { id: ids.seccion, torreId: ids.torre, nombre: 'Norte' },
        { id: ids.seccion2, torreId: ids.torre2, nombre: 'Norte' },
      ],
    });
    await db.unidad.createMany({
      data: [
        {
          id: ids.unidad,
          codigo: ids.unidad,
          torreId: ids.torre,
          seccionId: ids.seccion,
          cuotaMensual: 50,
        },
        {
          id: ids.unidad2,
          codigo: ids.unidad2,
          torreId: ids.torre2,
          seccionId: ids.seccion2,
          cuotaMensual: 50,
        },
      ],
    });
    await db.usuarioUnidad.createMany({
      data: [
        { userId: ids.residente, unidadId: ids.unidad },
        { userId: ids.vecino, unidadId: ids.unidad },
        { userId: ids.residente, unidadId: ids.unidad2 },
        { userId: ids.otro, unidadId: ids.unidad2 },
        { userId: ids.inactivo, unidadId: ids.unidad },
      ],
    });
  }, 30000);
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    if (db) {
      await db.lecturaComunicado.deleteMany({
        where: { comunicadoId: { in: comunicados } },
      });
      await db.comunicado.deleteMany({ where: { autorId: ids.admin } });
      await db.usuarioUnidad.deleteMany({
        where: {
          userId: { in: [ids.residente, ids.vecino, ids.otro, ids.inactivo] },
        },
      });
      await db.unidad.deleteMany({
        where: { id: { in: [ids.unidad, ids.unidad2] } },
      });
      await db.seccion.deleteMany({
        where: { id: { in: [ids.seccion, ids.seccion2] } },
      });
      await db.torre.deleteMany({
        where: { id: { in: [ids.torre, ids.torre2] } },
      });
      await db.user.deleteMany({
        where: {
          id: {
            in: [
              ids.admin,
              ids.residente,
              ids.vecino,
              ids.otro,
              ids.inactivo,
              ids.seguridad,
            ],
          },
        },
      });
    }
    await app?.close();
  });
  it('exige sesión y administrador para publicar, previsualizar, listar y consultar torres', async () => {
    await http().post('/api/v1/comunicados').send(body()).expect(401);
    for (const token of [tokens.residente, tokens.seguridad]) {
      await publicar(body(), token).expect(403);
      for (const path of [
        'torres',
        'comunicados/administracion',
        'comunicados/destinatarios?alcance=TODOS',
      ])
        await http()
          .get(`/api/v1/${path}`)
          .set('Authorization', token)
          .expect(403);
    }
    const torres = await http()
      .get('/api/v1/torres')
      .set('Authorization', tokens.admin)
      .expect(200);
    expect(
      torres.body.datos.find((t: { id: string }) => t.id === ids.torre)
        .secciones,
    ).toEqual([{ id: ids.seccion, nombre: 'Norte' }]);
  });
  it('previa y publicación deduplican residentes y excluyen roles e inactivos', async () => {
    for (const alcance of ['TODOS', 'TORRE', 'SECCION']) {
      const destinoId =
        alcance === 'TORRE'
          ? ids.torre
          : alcance === 'SECCION'
            ? ids.seccion
            : undefined;
      const query = new URLSearchParams({
        alcance,
        ...(destinoId ? { destinoId } : {}),
      });
      const previa = await http()
        .get(`/api/v1/comunicados/destinatarios?${query}`)
        .set('Authorization', tokens.admin)
        .expect(200);
      const r = await publicar(
        body({ alcance, ...(destinoId ? { destinoId } : {}) }),
      ).expect(201);
      comunicados.push(r.body.id);
      expect(r.body.destinatarios).toBe(alcance === 'TODOS' ? 3 : 2);
      expect(previa.body.destinatarios).toBe(r.body.destinatarios);
      const almacenado = await db.comunicado.findUniqueOrThrow({
        where: { id: r.body.id },
      });
      expect(almacenado.autorId).toBe(ids.admin);
      expect(almacenado.torreId).toBe(alcance === 'TORRE' ? ids.torre : null);
      expect(almacenado.seccionId).toBe(
        alcance === 'SECCION' ? ids.seccion : null,
      );
      const avisos = await db.notificacion.findMany({
        where: { referenciaId: r.body.id },
        select: {
          userId: true,
          moduloOrigen: true,
          tipoEvento: true,
          titulo: true,
          mensaje: true,
          claveEvento: true,
          estado: true,
        },
      });
      const esperados =
        alcance === 'TODOS'
          ? [ids.residente, ids.vecino, ids.otro]
          : [ids.residente, ids.vecino];
      expect(avisos.map(({ userId }) => userId).sort()).toEqual(
        esperados.sort(),
      );
      expect(avisos).toHaveLength(esperados.length);
      for (const aviso of avisos) {
        expect(aviso).toMatchObject({
          moduloOrigen: 'COMUNICADOS',
          tipoEvento: 'COMUNICADO_NUEVO',
          titulo: 'Nuevo comunicado',
          mensaje: 'Aviso oficial',
          claveEvento: `COMUNICADO_NUEVO:${r.body.id}`,
          estado: 'NO_LEIDA',
        });
      }
      const bandejaResidente = await http()
        .get('/api/v1/notificaciones/mias')
        .set('Authorization', tokens.residente)
        .expect(200);
      expect(
        bandejaResidente.body.datos.some(
          (aviso: { referenciaId: string }) => aviso.referenciaId === r.body.id,
        ),
      ).toBe(true);
      const bandejaOtro = await http()
        .get('/api/v1/notificaciones/mias')
        .set('Authorization', tokens.otro)
        .expect(200);
      expect(
        bandejaOtro.body.datos.some(
          (aviso: { referenciaId: string }) => aviso.referenciaId === r.body.id,
        ),
      ).toBe(alcance === 'TODOS');
    }
  });
  it('el aviso se llama después del commit y su fallo no despublica', async () => {
    vi.spyOn(notificaciones, 'crear').mockImplementationOnce(async (datos) => {
      expect(datos.referenciaId).toEqual(expect.any(String));
      expect(
        await db.comunicado.findUnique({ where: { id: datos.referenciaId! } }),
      ).not.toBeNull();
      throw new Error('H28 falla deliberadamente');
    });
    const r = await publicar().expect(201);
    comunicados.push(r.body.id);
    expect(await db.comunicado.count({ where: { id: r.body.id } })).toBe(1);
    expect(
      await db.notificacion.count({ where: { referenciaId: r.body.id } }),
    ).toBe(0);
  });
  it('valida largos, alcance y destino y no permite atribuir otro autor', async () => {
    const crearAviso = vi.spyOn(notificaciones, 'crear');
    for (const extra of [
      { titulo: '' },
      { titulo: '    ' },
      { titulo: 'abcd' },
      { titulo: 'x'.repeat(101) },
      { contenido: '' },
      { contenido: ' ' },
      { contenido: 'x'.repeat(2001) },
      { alcance: 'INVALIDO' },
      { alcance: 'TORRE' },
      { alcance: 'SECCION', destinoId: null },
      { alcance: 'TODOS', destinoId: ids.torre },
      { autorId: ids.residente },
      { alcance: 'TORRE', destinoId: 'invalido' },
    ])
      await publicar(body(extra)).expect(400);
    for (const alcance of ['TORRE', 'SECCION'])
      await publicar(body({ alcance, destinoId: randomUUID() })).expect(404);
    expect(crearAviso).not.toHaveBeenCalled();
    const valido = await publicar(
      body({ titulo: 'x'.repeat(100), contenido: 'x'.repeat(2000) }),
    ).expect(201);
    comunicados.push(valido.body.id);
    await http()
      .patch(`/api/v1/comunicados/${valido.body.id}`)
      .set('Authorization', tokens.admin)
      .send({ titulo: 'Editado' })
      .expect(404);
    await http()
      .delete(`/api/v1/comunicados/${valido.body.id}`)
      .set('Authorization', tokens.admin)
      .expect(404);
  });
  it('lista publicación y lecturas actuales, pagina y ordena sin datos privados', async () => {
    const r = await publicar(
      body({ alcance: 'TORRE', destinoId: ids.torre }),
    ).expect(201);
    comunicados.push(r.body.id);
    await db.lecturaComunicado.create({
      data: { comunicadoId: r.body.id, userId: ids.residente },
    });
    const lista = await http()
      .get('/api/v1/comunicados/administracion?pagina=1&tamanoPagina=1')
      .set('Authorization', tokens.admin)
      .expect(200);
    expect(lista.body.datos).toHaveLength(1);
    expect(lista.body.datos[0]).toMatchObject({
      id: r.body.id,
      leidoPor: 1,
      destinatarios: 2,
    });
    expect(lista.body.datos[0].contenido).toBeUndefined();
    for (const q of ['pagina=0', 'tamanoPagina=51', 'pagina=1.5'])
      await http()
        .get(`/api/v1/comunicados/administracion?${q}`)
        .set('Authorization', tokens.admin)
        .expect(400);
  });
});
