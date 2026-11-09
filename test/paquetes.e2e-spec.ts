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

const RUTA = '/api/v1/paquetes';
const RUTA_UNIDADES = '/api/v1/unidades';

describe.skipIf(!url)('Módulo 5 — Paquetería HTTP + PostgreSQL real', () => {
  let app: INestApplication;
  let prisma: import('../dist/prisma/services/prisma.service.js').PrismaService;
  let residente: string, admin: string, seguridad: string;
  let seguridadId: string;
  let unidadId: string, otraUnidadId: string, inactivaId: string;
  const users: string[] = [];
  const prefijo = `e2e-${randomUUID()}`;

  // El doble de H28 deja probar los dos criterios de la tarjeta: que se avisa
  // y que un fallo del aviso no deshace el registro del paquete.
  const avisos = { fallar: false, llamadas: [] as { codigo: string }[] };

  const http = () => request(app.getHttpServer());
  const body = (extra: Record<string, unknown> = {}) => ({
    unidadId,
    empresa: 'Urbano Express',
    descripcion: 'Caja mediana',
    ...extra,
  });
  const registrar = (cuerpo: Record<string, unknown>, token = seguridad) =>
    http().post(RUTA).set('Authorization', token).send(cuerpo);

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'clave-aislada-exclusiva-pruebas-paquetes-2026';
    process.env.NODE_ENV = 'test';
    const { AppModule } = await import('../dist/app.module.js');
    const { PrismaService } = await import(
      '../dist/prisma/services/prisma.service.js'
    );
    const { AvisosPaquete } = await import(
      '../dist/paquetes/services/avisos.service.js'
    );
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AvisosPaquete)
      .useValue({
        paqueteRecibido: (aviso: { codigo: string }) => {
          avisos.llamadas.push(aviso);
          return avisos.fallar
            ? Promise.reject(new Error('H28 no responde'))
            : Promise.resolve();
        },
      })
      .compile();
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

    residente = (await crearUser('RESIDENTE', 'residente')).token;
    admin = (await crearUser('ADMINISTRADOR', 'admin')).token;
    const s = await crearUser('SEGURIDAD', 'seguridad');
    seguridad = s.token;
    seguridadId = s.id;

    const torre = await prisma.torre.create({
      data: { nombre: prefijo.slice(0, 30) },
    });
    const seccion = await prisma.seccion.create({
      data: { nombre: 'Norte', torreId: torre.id },
    });
    const unidad = (codigo: string, activa = true) =>
      prisma.unidad.create({
        data: {
          codigo,
          torreId: torre.id,
          seccionId: seccion.id,
          cuotaMensual: '50.00',
          activa,
        },
      });
    unidadId = (await unidad(`${prefijo}-1`)).id;
    otraUnidadId = (await unidad(`${prefijo}-2`)).id;
    inactivaId = (await unidad(`${prefijo}-3`, false)).id;
  });

  beforeEach(async () => {
    avisos.fallar = false;
    avisos.llamadas.length = 0;
    await prisma.paquete.deleteMany({
      where: { registradoPorId: { in: users } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.paquete.deleteMany({
        where: { registradoPorId: { in: users } },
      });
      await prisma.unidad.deleteMany({
        where: { codigo: { startsWith: prefijo } },
      });
      await prisma.seccion.deleteMany({
        where: { torre: { nombre: prefijo.slice(0, 30) } },
      });
      await prisma.torre.deleteMany({ where: { nombre: prefijo.slice(0, 30) } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    await app?.close();
  });

  describe('POST paquetes', () => {
    it('registra el paquete con código, estado inicial y unidad', async () => {
      const r = await registrar(body()).expect(201);
      expect(r.body).toMatchObject({
        unidadId,
        unidadCodigo: `${prefijo}-1`,
        empresa: 'Urbano Express',
        descripcion: 'Caja mediana',
        estado: 'PENDIENTE',
      });
      expect(r.body.codigo).toMatch(/^PAQ-\d{6,}$/);
      expect(r.body.recibidoAt).toBeTruthy();

      const guardado = await prisma.paquete.findUniqueOrThrow({
        where: { id: r.body.id },
      });
      // recibidoAt y registradoPor los pone el servidor, no el cliente.
      expect(guardado.registradoPorId).toBe(seguridadId);
      expect(guardado.entregadoAt).toBeNull();
    });

    it('guarda null cuando no se envía descripción', async () => {
      const r = await registrar({
        unidadId,
        empresa: 'Urbano Express',
      }).expect(201);
      expect(r.body.descripcion).toBeNull();
    });

    it('recorta los espacios de la empresa', async () => {
      const r = await registrar(body({ empresa: '  DHL  ' })).expect(201);
      expect(r.body.empresa).toBe('DHL');
    });

    it('avisa a la unidad después de registrar', async () => {
      const r = await registrar(body()).expect(201);
      expect(avisos.llamadas).toHaveLength(1);
      expect(avisos.llamadas[0].codigo).toBe(r.body.codigo);
    });

    // La tarjeta lo pide explícitamente: el aviso es posterior al commit.
    it('deja el paquete registrado aunque el aviso falle', async () => {
      avisos.fallar = true;
      const r = await registrar(body()).expect(201);
      expect(
        await prisma.paquete.findUnique({ where: { id: r.body.id } }),
      ).not.toBeNull();
    });

    // Cada caso arma su cuerpo entero dentro de una función: los argumentos de
    // it.each se evalúan al recolectar, cuando unidadId todavía no existe.
    it.each<[string, () => Record<string, unknown>]>([
      ['sin unidad', () => ({ empresa: 'DHL' })],
      [
        'con una unidad que no es uuid',
        () => ({ unidadId: 'abc', empresa: 'DHL' }),
      ],
      ['sin empresa', () => ({ unidadId })],
      ['con empresa de un carácter', () => ({ unidadId, empresa: 'D' })],
      ['con empresa en blanco', () => ({ unidadId, empresa: '   ' })],
      [
        'con empresa de 61 caracteres',
        () => ({ unidadId, empresa: 'a'.repeat(61) }),
      ],
      [
        'con descripción de 121 caracteres',
        () => ({ unidadId, empresa: 'DHL', descripcion: 'a'.repeat(121) }),
      ],
      [
        'con un campo fuera del contrato',
        () => ({ unidadId, empresa: 'DHL', guia: '12345' }),
      ],
    ])('responde 400 %s', async (_caso, cuerpo) => {
      await registrar(cuerpo()).expect(400);
    });

    it('responde 404 con una unidad inexistente', () =>
      registrar(body({ unidadId: randomUUID() })).expect(404));

    // Para la recepción, una unidad dada de baja es lo mismo que inexistente.
    it('responde 404 con una unidad inactiva', () =>
      registrar(body({ unidadId: inactivaId })).expect(404));

    it.each([
      ['residente', () => residente],
      ['administrador', () => admin],
    ])('responde 403 al rol %s', async (_rol, token) => {
      await registrar(body(), token()).expect(403);
    });

    it('responde 401 sin sesión', () =>
      http().post(RUTA).send(body()).expect(401));

    // El cerrojo de verdad: la secuencia de Postgres, no el índice único.
    it('con dos registros simultáneos los códigos son distintos', async () => {
      const intentos = await Promise.all([registrar(body()), registrar(body())]);
      expect(intentos.map((i) => i.status)).toEqual([201, 201]);
      const [uno, otro] = intentos.map((i) => i.body.codigo as string);
      expect(uno).not.toBe(otro);
    });

    it('entrega códigos crecientes', async () => {
      const primero = await registrar(body()).expect(201);
      const segundo = await registrar(body()).expect(201);
      expect(segundo.body.codigo > primero.body.codigo).toBe(true);
    });
  });

  describe('GET paquetes', () => {
    const listar = (query = '', token = seguridad) =>
      http().get(`${RUTA}${query}`).set('Authorization', token);

    const sembrar = (extra: Record<string, unknown> = {}) =>
      prisma.paquete.create({
        data: {
          codigo: `PAQ-${randomUUID().slice(0, 8)}`,
          unidadId,
          empresa: 'Urbano Express',
          registradoPorId: seguridadId,
          ...extra,
        },
      });

    it('lista con el más reciente primero', async () => {
      await sembrar({
        empresa: 'Viejo',
        recibidoAt: new Date(Date.now() - 3_600_000),
      });
      await sembrar({ empresa: 'Nuevo' });
      const r = await listar().expect(200);
      expect(r.body.total).toBe(2);
      expect(r.body.datos[0].empresa).toBe('Nuevo');
      expect(r.body.datos[0].unidadCodigo).toBe(`${prefijo}-1`);
    });

    it('filtra por estado', async () => {
      await sembrar();
      await sembrar({ estado: 'ENTREGADO', entregadoAt: new Date() });
      const r = await listar('?estado=ENTREGADO').expect(200);
      expect(r.body.total).toBe(1);
      expect(r.body.datos[0].estado).toBe('ENTREGADO');
    });

    it('filtra por unidad', async () => {
      await sembrar();
      await sembrar({ unidadId: otraUnidadId });
      const r = await listar(`?unidadId=${otraUnidadId}`).expect(200);
      expect(r.body.total).toBe(1);
      expect(r.body.datos[0].unidadCodigo).toBe(`${prefijo}-2`);
    });

    it('pagina y devuelve el total sin paginar', async () => {
      await sembrar();
      await sembrar();
      await sembrar();
      const r = await listar('?pagina=2&tamanoPagina=2').expect(200);
      expect(r.body).toMatchObject({ total: 3, pagina: 2, tamanoPagina: 2 });
      expect(r.body.datos).toHaveLength(1);
    });

    it('el administrador también puede consultarla', () =>
      listar('', admin).expect(200));

    it('responde 403 al residente', () => listar('', residente).expect(403));

    it.each([
      ['con página cero', '?pagina=0'],
      ['con tamaño de página mayor a 100', '?tamanoPagina=101'],
      ['con un estado que no existe', '?estado=EXTRAVIADO'],
    ])('responde 400 %s', async (_caso, query) => {
      await listar(query).expect(400);
    });
  });

  describe('GET unidades', () => {
    const listar = (query = '', token = seguridad) =>
      http().get(`${RUTA_UNIDADES}${query}`).set('Authorization', token);

    it('devuelve las activas con su torre', async () => {
      const r = await listar().expect(200);
      const mias = (r.body.datos as { codigo: string; torre: string }[]).filter(
        (u) => u.codigo.startsWith(prefijo),
      );
      expect(mias.map((u) => u.codigo)).toEqual([
        `${prefijo}-1`,
        `${prefijo}-2`,
      ]);
      expect(mias[0].torre).toBe(prefijo.slice(0, 30));
    });

    it('no devuelve las inactivas', async () => {
      const r = await listar().expect(200);
      expect(
        (r.body.datos as { id: string }[]).some((u) => u.id === inactivaId),
      ).toBe(false);
    });

    it('filtra por código', async () => {
      const r = await listar(`?buscar=${prefijo}-2`).expect(200);
      expect(r.body.datos).toHaveLength(1);
      expect(r.body.datos[0].codigo).toBe(`${prefijo}-2`);
    });

    it('filtra por nombre de torre', async () => {
      const r = await listar(`?buscar=${prefijo.slice(0, 30)}`).expect(200);
      const mias = (r.body.datos as { codigo: string }[]).filter((u) =>
        u.codigo.startsWith(prefijo),
      );
      expect(mias).toHaveLength(2);
    });

    it('el administrador también puede consultarlo', () =>
      listar('', admin).expect(200));

    it('responde 403 al residente', () => listar('', residente).expect(403));

    it('responde 401 sin sesión', () =>
      http().get(RUTA_UNIDADES).expect(401));
  });
});
