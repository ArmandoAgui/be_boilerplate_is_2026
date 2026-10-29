import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test'))
  throw new Error(
    'TEST_DATABASE_URL debe apuntar a una BD aislada con sufijo _test',
  );
describe.skipIf(!url)('H5–H8 HTTP + PostgreSQL real', () => {
  let app: INestApplication;
  let prisma: import('../dist/prisma/services/prisma.service.js').PrismaService;
  let admin: string,
    residente: string,
    vecino: string,
    ajeno: string,
    seguridad: string;
  let unidadId: string,
    otraUnidadId: string,
    areaId: string,
    segundaAreaId: string,
    torreId: string,
    seccionId: string;
  const users: string[] = [];
  const areas: string[] = [];
  const prefijo = `e2e-${randomUUID()}`;
  const horarios = Array.from({ length: 7 }, (_, diaSemana) => ({
    diaSemana,
    horaInicio: '06:00',
    horaFin: '22:00',
  }));
  const manana = new Date(Date.now() + 24 * 3600000 - 6 * 3600000)
    .toISOString()
    .slice(0, 10);
  const inicio = `${manana}T12:00:00-06:00`;
  const http = () => request(app.getHttpServer());
  const body = (area = areaId, unidad = unidadId) => ({
    areaId: area,
    unidadId: unidad,
    inicio,
    duracionHoras: 1,
    asistentes: 2,
  });
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'clave-aislada-exclusiva-pruebas-reservas-2026';
    process.env.NODE_ENV = 'test';
    // Importar el build preserva emitDecoratorMetadata, que es necesario para DI y ValidationPipe de Nest.
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
    prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const hash = await bcrypt.hash('Prueba123!', 4);
    const crearUser = async (
      rol: 'RESIDENTE' | 'ADMINISTRADOR' | 'SEGURIDAD',
      n: string,
    ) => {
      const u = await prisma.user.create({
        data: {
          email: `${prefijo}-${n}@condominio.test`,
          nombre: n,
          rol,
          passwordHash: hash,
        },
      });
      users.push(u.id);
      return {
        id: u.id,
        token: `Bearer ${jwt.sign({ sub: u.id, email: u.email })}`,
      };
    };
    admin = (await crearUser('ADMINISTRADOR', 'admin')).token;
    const r = await crearUser('RESIDENTE', 'residente');
    residente = r.token;
    const v = await crearUser('RESIDENTE', 'vecino');
    vecino = v.token;
    const a = await crearUser('RESIDENTE', 'ajeno');
    ajeno = a.token;
    seguridad = (await crearUser('SEGURIDAD', 'seguridad')).token;
    const torre = await prisma.torre.create({
      data: { nombre: prefijo.slice(0, 30) },
    });
    torreId = torre.id;
    const seccion = await prisma.seccion.create({
      data: { nombre: 'Norte', torreId },
    });
    seccionId = seccion.id;
    const u = await prisma.unidad.create({
      data: {
        codigo: `${prefijo}-1`,
        torreId,
        seccionId,
        cuotaMensual: '50.00',
        usuarios: { create: [{ userId: r.id }, { userId: v.id }] },
      },
    });
    unidadId = u.id;
    const u2 = await prisma.unidad.create({
      data: {
        codigo: `${prefijo}-2`,
        torreId,
        seccionId,
        cuotaMensual: '50.00',
        usuarios: { create: [{ userId: a.id }] },
      },
    });
    otraUnidadId = u2.id;
    for (const nombre of ['uno', 'dos']) {
      const area = await prisma.areaComun.create({
        data: {
          nombre: `${prefijo}-${nombre}`,
          capacidad: 40,
          horarios: { create: horarios },
        },
      });
      areas.push(area.id);
    }
    [areaId, segundaAreaId] = areas;
  }, 30000);
  beforeEach(async () => {
    await prisma.reserva.deleteMany({ where: { areaId: { in: areas } } });
    await prisma.areaComun.update({
      where: { id: areaId },
      data: { activa: true, capacidad: 40 },
    });
    await prisma.horarioArea.deleteMany({ where: { areaId } });
    await prisma.horarioArea.createMany({
      data: horarios.map((h) => ({ ...h, areaId })),
    });
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.reserva.deleteMany({ where: { userId: { in: users } } });
      await prisma.areaComun.deleteMany({ where: { id: { in: areas } } });
      await prisma.usuarioUnidad.deleteMany({
        where: { userId: { in: users } },
      });
      await prisma.unidad.deleteMany({
        where: { id: { in: [unidadId, otraUnidadId] } },
      });
      await prisma.seccion.delete({ where: { id: seccionId } });
      await prisma.torre.delete({ where: { id: torreId } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    await app?.close();
  });
  it('health y autenticación del boilerplate funcionan', async () => {
    await http().get('/api/v1').expect(200);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: users[1] } });
    const r = await http()
      .post('/api/v1/auth/login')
      .send({ email: u.email, password: 'Prueba123!' })
      .expect(200);
    expect(r.body.accessToken).toBeTypeOf('string');
    expect(r.body.user.rol).toBe('RESIDENTE');
    expect(r.body.user.passwordHash).toBeUndefined();
  });
  it('401 sin sesión, 403 para seguridad y sin escalamiento al registrar', async () => {
    await http().get('/api/v1/areas').expect(401);
    await http()
      .get('/api/v1/areas')
      .set('Authorization', seguridad)
      .expect(403);
    await http()
      .post('/api/v1/areas')
      .set('Authorization', residente)
      .send({ nombre: 'Área no permitida', capacidad: 10, horarios })
      .expect(403);
    await http()
      .post('/api/v1/users')
      .send({
        email: 'escalamiento@condominio.test',
        password: 'Prueba123!',
        rol: 'ADMINISTRADOR',
      })
      .expect(400);
  });
  it('consulta áreas y unidades vinculadas', async () => {
    const r = await http()
      .get('/api/v1/areas')
      .set('Authorization', residente)
      .expect(200);
    expect(r.body.datos.some((a: { id: string }) => a.id === areaId)).toBe(
      true,
    );
    const u = await http()
      .get('/api/v1/unidades/mias')
      .set('Authorization', residente)
      .expect(200);
    expect(u.body.datos).toEqual([{ id: unidadId, codigo: `${prefijo}-1` }]);
  });
  it('crea, persiste UTC y consulta reservas compartidas con paginación', async () => {
    const r = await http()
      .post('/api/v1/reservas')
      .set('Authorization', residente)
      .send(body())
      .expect(201);
    expect(r.body.codigo).toMatch(/^RES-\d{6,}$/);
    expect(r.body.inicio).toBe(new Date(inicio).toISOString());
    const guardada = await prisma.reserva.findUniqueOrThrow({
      where: { id: r.body.id },
    });
    expect(guardada.fin.getTime() - guardada.inicio.getTime()).toBe(3600000);
    const lista = await http()
      .get('/api/v1/reservas/mias?pagina=1&tamanoPagina=1')
      .set('Authorization', vecino)
      .expect(200);
    expect(lista.body.total).toBe(1);
    expect(lista.body.datos[0].areaNombre).toContain(prefijo);
    await http()
      .get('/api/v1/reservas/mias?pagina=0')
      .set('Authorization', residente)
      .expect(400);
  });
  it('dos solicitudes simultáneas al mismo horario: una 201 y otra 409', async () => {
    const respuestas = await Promise.all([
      http()
        .post('/api/v1/reservas')
        .set('Authorization', residente)
        .send(body()),
      http()
        .post('/api/v1/reservas')
        .set('Authorization', ajeno)
        .send(body(areaId, otraUnidadId)),
    ]);
    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    expect(respuestas.find((r) => r.status === 409)?.body.message).toBe(
      'Ese horario ya fue reservado. Elija otro.',
    );
    expect(
      await prisma.reserva.count({ where: { areaId, estado: 'CONFIRMADA' } }),
    ).toBe(1);
  });
  it('protege límite por unidad con solicitudes simultáneas a áreas distintas', async () => {
    await http()
      .post('/api/v1/reservas')
      .set('Authorization', residente)
      .send({ ...body(), inicio: `${manana}T08:00:00-06:00` })
      .expect(201);
    const respuestas = await Promise.all([
      http()
        .post('/api/v1/reservas')
        .set('Authorization', residente)
        .send(body()),
      http()
        .post('/api/v1/reservas')
        .set('Authorization', vecino)
        .send(body(segundaAreaId)),
    ]);
    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    expect(
      await prisma.reserva.count({ where: { unidadId, estado: 'CONFIRMADA' } }),
    ).toBe(2);
  });
  it('ocupación y cancelación de otro residente de la unidad liberan bloque', async () => {
    const r = await http()
      .post('/api/v1/reservas')
      .set('Authorization', residente)
      .send(body())
      .expect(201);
    const disponible = () =>
      http()
        .get(`/api/v1/areas/${areaId}/disponibilidad?fecha=${manana}`)
        .set('Authorization', residente);
    expect((await disponible().expect(200)).body.bloques[12].estado).toBe(
      'OCUPADO',
    );
    await http()
      .patch(`/api/v1/reservas/${r.body.id}/cancelacion`)
      .set('Authorization', ajeno)
      .expect(404);
    const respuestas = await Promise.all([
      http()
        .patch(`/api/v1/reservas/${r.body.id}/cancelacion`)
        .set('Authorization', vecino),
      http()
        .patch(`/api/v1/reservas/${r.body.id}/cancelacion`)
        .set('Authorization', residente),
    ]);
    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 409,
    ]);
    expect((await disponible().expect(200)).body.bloques[12].estado).toBe(
      'DISPONIBLE',
    );
    expect(
      (await prisma.reserva.findUniqueOrThrow({ where: { id: r.body.id } }))
        .canceladaAt,
    ).not.toBeNull();
  });
  it('rechaza cancelación fuera de plazo', async () => {
    const proximaHora = new Date();
    proximaHora.setUTCMinutes(0, 0, 0);
    proximaHora.setUTCHours(proximaHora.getUTCHours() + 1);
    const r = await prisma.reserva.create({
      data: {
        areaId,
        unidadId,
        userId: users[1],
        inicio: proximaHora,
        fin: new Date(proximaHora.getTime() + 3600000),
        asistentes: 1,
      },
    });
    await http()
      .patch(`/api/v1/reservas/${r.id}/cancelacion`)
      .set('Authorization', residente)
      .expect(409);
  });
  it('rechaza unidad ajena, capacidad, duración, hora y fechas inválidas', async () => {
    await http()
      .post('/api/v1/reservas')
      .set('Authorization', residente)
      .send(body(areaId, otraUnidadId))
      .expect(403);
    for (const extra of [
      { asistentes: 41 },
      { asistentes: 0 },
      { duracionHoras: 5 },
      { inicio: `${manana}T12:30:00-06:00` },
      { inicio: `${manana}T23:00:00-06:00` },
      { inicio: '2020-01-01T12:00:00Z' },
      { inicio: `${manana}T12:00:00` },
    ]) {
      await http()
        .post('/api/v1/reservas')
        .set('Authorization', residente)
        .send({ ...body(), ...extra })
        .expect(400);
    }
    for (const fecha of ['2020-01-01', '2099-01-01', '2026-02-30'])
      await http()
        .get(`/api/v1/areas/${areaId}/disponibilidad?fecha=${fecha}`)
        .set('Authorization', residente)
        .expect(400);
  });
  it('mantiene reservas ante edición, desactivación y reemplazo atómico de horarios', async () => {
    const r = await http()
      .post('/api/v1/reservas')
      .set('Authorization', residente)
      .send(body())
      .expect(201);
    await http()
      .patch(`/api/v1/areas/${areaId}`)
      .set('Authorization', admin)
      .send({
        capacidad: 1,
        activa: false,
        horarios: [{ diaSemana: 1, horaInicio: '08:00', horaFin: '09:00' }],
      })
      .expect(200);
    const guardada = await prisma.reserva.findUniqueOrThrow({
      where: { id: r.body.id },
    });
    expect(guardada.asistentes).toBe(2);
    expect(guardada.estado).toBe('CONFIRMADA');
    expect(guardada.inicio.toISOString()).toBe(new Date(inicio).toISOString());
    expect(await prisma.horarioArea.count({ where: { areaId } })).toBe(1);
    await http()
      .post('/api/v1/reservas')
      .set('Authorization', residente)
      .send({ ...body(), inicio: `${manana}T14:00:00-06:00` })
      .expect(400);
    await http()
      .get(`/api/v1/areas/${areaId}/disponibilidad?fecha=${manana}`)
      .set('Authorization', residente)
      .expect(404);
    expect(
      (
        await http().get('/api/v1/areas').set('Authorization', admin)
      ).body.datos.some((a: { id: string }) => a.id === areaId),
    ).toBe(true);
    expect(
      (
        await http().get('/api/v1/areas').set('Authorization', residente)
      ).body.datos.some((a: { id: string }) => a.id === areaId),
    ).toBe(false);
  });
  it('valida áreas, duplicados y conserva horarios cuando PATCH falla', async () => {
    const nombre = (
      await prisma.areaComun.findUniqueOrThrow({ where: { id: areaId } })
    ).nombre;
    await http()
      .post('/api/v1/areas')
      .set('Authorization', admin)
      .send({ nombre, capacidad: 10, horarios })
      .expect(409);
    const creada = await http()
      .post('/api/v1/areas')
      .set('Authorization', admin)
      .send({ nombre: `${prefijo}-nueva`, capacidad: 10, horarios })
      .expect(201);
    areas.push(creada.body.id);
    for (const extra of [
      { capacidad: 0 },
      { capacidad: 501 },
      { nombre: 'ab' },
      { horarios: [] },
      { horarios: [{ diaSemana: 1, horaInicio: '14:00', horaFin: '12:00' }] },
      {
        horarios: [
          { diaSemana: 1, horaInicio: '12:00', horaFin: '14:00' },
          { diaSemana: 1, horaInicio: '13:00', horaFin: '15:00' },
        ],
      },
      { capacidad: null },
      { activa: null },
    ]) {
      await http()
        .patch(`/api/v1/areas/${areaId}`)
        .set('Authorization', admin)
        .send(extra)
        .expect(400);
    }
    const r = await http()
      .patch(`/api/v1/areas/${areaId}`)
      .set('Authorization', admin)
      .send({
        nombre: (
          await prisma.areaComun.findUniqueOrThrow({
            where: { id: segundaAreaId },
          })
        ).nombre,
        horarios: [{ diaSemana: 1, horaInicio: '08:00', horaFin: '09:00' }],
      })
      .expect(409);
    expect(typeof r.body.message).toBe('string');
    expect(await prisma.horarioArea.count({ where: { areaId } })).toBe(7);
  });
});
