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

const HORA = 3_600_000;
const RUTA = '/api/v1/visitas/autorizaciones';

describe.skipIf(!url)('H13 HTTP + PostgreSQL real', () => {
  let app: INestApplication;
  let prisma: import('../dist/prisma/services/prisma.service.js').PrismaService;
  let residente: string, vecino: string, ajeno: string;
  let admin: string, seguridad: string;
  let residenteId: string, ajenoId: string;
  let unidadId: string, otraUnidadId: string;
  let torreId: string, seccionId: string;
  const users: string[] = [];
  const prefijo = `e2e-${randomUUID()}`;

  const http = () => request(app.getHttpServer());
  const enHoras = (h: number) => new Date(Date.now() + h * HORA).toISOString();
  const body = (extra: Record<string, unknown> = {}) => ({
    unidadId,
    visitanteNombre: 'Juan Perez',
    visitanteDocumento: '012345678',
    inicio: enHoras(2),
    fin: enHoras(10),
    ...extra,
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'clave-aislada-exclusiva-pruebas-visitas-2026';
    process.env.NODE_ENV = 'test';
    // Se importa el build: conserva emitDecoratorMetadata, que Nest necesita
    // para la inyección de dependencias y el ValidationPipe.
    const { AppModule } = await import('../dist/app.module.js');
    const { PrismaService } = await import(
      '../dist/prisma/services/prisma.service.js'
    );
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

    const r = await crearUser('RESIDENTE', 'residente');
    residente = r.token;
    residenteId = r.id;
    const v = await crearUser('RESIDENTE', 'vecino');
    vecino = v.token;
    const a = await crearUser('RESIDENTE', 'ajeno');
    ajeno = a.token;
    ajenoId = a.id;
    admin = (await crearUser('ADMINISTRADOR', 'admin')).token;
    seguridad = (await crearUser('SEGURIDAD', 'seguridad')).token;

    const torre = await prisma.torre.create({
      data: { nombre: prefijo.slice(0, 30) },
    });
    torreId = torre.id;
    const seccion = await prisma.seccion.create({
      data: { nombre: 'Norte', torreId },
    });
    seccionId = seccion.id;
    // residente y vecino comparten unidad; ajeno vive en otra.
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
  }, 30000);

  beforeEach(async () => {
    await prisma.autorizacionVisita.deleteMany({
      where: { residenteId: { in: users } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.autorizacionVisita.deleteMany({
        where: { residenteId: { in: users } },
      });
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

  const crear = (token = residente, extra = {}) =>
    http().post(RUTA).set('Authorization', token).send(body(extra));

  describe('POST autorizaciones', () => {
    it('crea la autorización en estado VIGENTE y la persiste', async () => {
      const r = await crear().expect(201);
      expect(r.body).toMatchObject({
        unidadId,
        visitanteNombre: 'Juan Perez',
        visitanteDocumento: '012345678',
        estado: 'VIGENTE',
      });
      // El contrato de KAN-96 es cerrado: nada de campos extra.
      expect(Object.keys(r.body).sort()).toEqual(
        [
          'estado',
          'fin',
          'id',
          'inicio',
          'unidadId',
          'visitanteDocumento',
          'visitanteNombre',
        ].sort(),
      );
      const guardada = await prisma.autorizacionVisita.findUniqueOrThrow({
        where: { id: r.body.id },
      });
      expect(guardada.residenteId).toBe(residenteId);
      expect(guardada.canceladaAt).toBeNull();
    });

    it.each([
      ['vigencia mayor a 24 horas', { inicio: enHoras(1), fin: enHoras(26) }],
      ['fin igual al inicio', { inicio: enHoras(5), fin: enHoras(5) }],
      ['fin anterior al inicio', { inicio: enHoras(5), fin: enHoras(4) }],
      ['inicio en el pasado', { inicio: enHoras(-1), fin: enHoras(5) }],
      [
        'inicio a más de 30 días',
        { inicio: enHoras(30 * 24 + 2), fin: enHoras(30 * 24 + 4) },
      ],
      ['documento con guiones', { visitanteDocumento: '0123-4567' }],
      ['documento muy corto', { visitanteDocumento: '123' }],
      ['nombre muy corto', { visitanteNombre: 'Jo' }],
      ['inicio sin zona horaria', { inicio: '2026-12-01T10:00:00' }],
    ])('rechaza con 400: %s', async (_caso, extra) => {
      await crear(residente, extra).expect(400);
    });

    it('responde 403 con una unidad que no es del residente', () =>
      crear(residente, { unidadId: otraUnidadId }).expect(403));

    it('responde 404 con una unidad inexistente', () =>
      crear(residente, { unidadId: randomUUID() }).expect(404));

    it.each([
      ['administrador', () => admin],
      ['seguridad', () => seguridad],
    ])('responde 403 al rol %s', async (_rol, token) => {
      await crear(token()).expect(403);
    });

    it('responde 401 sin sesión', () =>
      http().post(RUTA).send(body()).expect(401));
  });

  describe('GET autorizaciones/mias', () => {
    it('devuelve solo las propias, no las del vecino de la misma unidad', async () => {
      const mia = await crear().expect(201);
      await http()
        .post(RUTA)
        .set('Authorization', vecino)
        .send(body({ visitanteNombre: 'Otra Visita' }))
        .expect(201);

      const r = await http()
        .get(`${RUTA}/mias`)
        .set('Authorization', residente)
        .expect(200);
      expect(r.body.total).toBe(1);
      expect(r.body.datos[0]).toMatchObject({
        id: mia.body.id,
        unidadCodigo: `${prefijo}-1`,
        estado: 'VIGENTE',
      });
    });

    it('deriva VENCIDA de una vigente cuyo fin ya pasó', async () => {
      // Se inserta directo: la validación de la API impide crear algo vencido.
      await prisma.autorizacionVisita.create({
        data: {
          residenteId,
          unidadId,
          visitanteNombre: 'Visita Vieja',
          visitanteDocumento: '987654321',
          inicio: new Date(Date.now() - 10 * HORA),
          fin: new Date(Date.now() - 2 * HORA),
        },
      });
      const r = await http()
        .get(`${RUTA}/mias`)
        .set('Authorization', residente)
        .expect(200);
      expect(r.body.datos[0].estado).toBe('VENCIDA');

      const vencidas = await http()
        .get(`${RUTA}/mias?estado=VENCIDA`)
        .set('Authorization', residente)
        .expect(200);
      expect(vencidas.body.total).toBe(1);

      // La misma fila no debe aparecer al filtrar por vigentes.
      const vigentes = await http()
        .get(`${RUTA}/mias?estado=VIGENTE`)
        .set('Authorization', residente)
        .expect(200);
      expect(vigentes.body.total).toBe(0);
    });

    it('responde 403 a un rol que no es residente', () =>
      http().get(`${RUTA}/mias`).set('Authorization', seguridad).expect(403));
  });

  describe('PATCH autorizaciones/:id/cancelacion', () => {
    it('cancela una vigente y guarda la fecha', async () => {
      const { body: creada } = await crear().expect(201);
      const r = await http()
        .patch(`${RUTA}/${creada.id}/cancelacion`)
        .set('Authorization', residente)
        .expect(200);
      expect(r.body.estado).toBe('CANCELADA');
      const guardada = await prisma.autorizacionVisita.findUniqueOrThrow({
        where: { id: creada.id },
      });
      expect(guardada.estado).toBe('CANCELADA');
      expect(guardada.canceladaAt).not.toBeNull();
    });

    it('responde 409 al cancelar dos veces', async () => {
      const { body: creada } = await crear().expect(201);
      await http()
        .patch(`${RUTA}/${creada.id}/cancelacion`)
        .set('Authorization', residente)
        .expect(200);
      await http()
        .patch(`${RUTA}/${creada.id}/cancelacion`)
        .set('Authorization', residente)
        .expect(409);
    });

    it('con dos cancelaciones simultáneas solo una gana', async () => {
      const { body: creada } = await crear().expect(201);
      const intentos = await Promise.all(
        [1, 2].map(() =>
          http()
            .patch(`${RUTA}/${creada.id}/cancelacion`)
            .set('Authorization', residente),
        ),
      );
      expect(intentos.map((i) => i.status).sort()).toEqual([200, 409]);
    });

    it('responde 404 al cancelar la de otro residente', async () => {
      const ajena = await prisma.autorizacionVisita.create({
        data: {
          residenteId: ajenoId,
          unidadId: otraUnidadId,
          visitanteNombre: 'Visita Ajena',
          visitanteDocumento: '555555555',
          inicio: new Date(Date.now() + 2 * HORA),
          fin: new Date(Date.now() + 6 * HORA),
        },
      });
      await http()
        .patch(`${RUTA}/${ajena.id}/cancelacion`)
        .set('Authorization', residente)
        .expect(404);
      // Y sigue intacta para su dueño.
      const sigue = await prisma.autorizacionVisita.findUniqueOrThrow({
        where: { id: ajena.id },
      });
      expect(sigue.estado).toBe('VIGENTE');
    });

    it('responde 404 con un id inexistente', () =>
      http()
        .patch(`${RUTA}/${randomUUID()}/cancelacion`)
        .set('Authorization', residente)
        .expect(404));

    it('responde 400 con un id que no es uuid', () =>
      http()
        .patch(`${RUTA}/no-es-uuid/cancelacion`)
        .set('Authorization', residente)
        .expect(400));

    it('responde 403 al rol administrador', async () => {
      const { body: creada } = await crear().expect(201);
      await http()
        .patch(`${RUTA}/${creada.id}/cancelacion`)
        .set('Authorization', admin)
        .expect(403);
    });
  });
});
