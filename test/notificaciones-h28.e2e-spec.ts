import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { PrismaService as Db } from '../src/prisma/services/prisma.service.js';
import type { CuotasPorVencerJob as CuotasJob } from '../src/cuotas/services/cuotas-por-vencer.job.js';
import type { NotificacionesService as ServicioNotificaciones } from '../src/notificaciones/services/notificaciones.service.js';

const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL debe apuntar a una BD aislada _test');
}

describe.skipIf(!url)('H28 · recordatorios de cuotas', () => {
  let app: INestApplication;
  let db: Db;
  let job: CuotasJob;
  let notificaciones: ServicioNotificaciones;
  let jwt: JwtService;
  const prefijo = `h28-${randomUUID()}`;
  const userIds: string[] = [];
  const unidadIds: string[] = [];
  const cuotaIds: string[] = [];
  let seccionId: string;
  let torreId: string;
  let cuotaEsperadaId: string;
  let cuotaFallaId: string;
  let cuotaPagadaId: string;
  let cuotaDosDiasId: string;
  let cuotaCuatroDiasId: string;
  let cuotaSinResidenteId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'h28-cuotas-e2e-secret-largo-aislado';
    process.env.NODE_ENV = 'test';

    const { AppModule } = await import('../dist/app.module.js');
    const { PrismaService } =
      await import('../dist/prisma/services/prisma.service.js');
    const { CuotasPorVencerJob } =
      await import('../dist/cuotas/services/cuotas-por-vencer.job.js');
    const { NotificacionesService } =
      await import('../dist/notificaciones/services/notificaciones.service.js');
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
    db = app.get(PrismaService);
    job = app.get(CuotasPorVencerJob);
    notificaciones = app.get(NotificacionesService);
    jwt = app.get(JwtService);

    const sufijo = randomUUID().slice(0, 20);
    const torre = await db.torre.create({
      data: { nombre: `H28-${sufijo}` },
    });
    torreId = torre.id;
    const seccion = await db.seccion.create({
      data: { nombre: `S-${sufijo}`, torreId },
    });
    seccionId = seccion.id;

    const crearUnidad = async (indice: number) => {
      const unidad = await db.unidad.create({
        data: {
          codigo: `${prefijo}-${indice}`,
          torreId,
          seccionId,
          cuotaMensual: '50.00',
        },
      });
      unidadIds.push(unidad.id);
      return unidad.id;
    };
    const unidades = await Promise.all(
      Array.from({ length: 6 }, (_, indice) => crearUnidad(indice + 1)),
    );

    const crearResidente = async (indice: number) => {
      const user = await db.user.create({
        data: {
          email: `${prefijo}-${indice}@test.invalid`,
          passwordHash: 'solo-prueba',
          nombre: `Residente ${indice}`,
          rol: 'RESIDENTE',
        },
      });
      userIds.push(user.id);
      return user.id;
    };
    const residentes = await Promise.all([
      crearResidente(1),
      crearResidente(2),
      crearResidente(3),
      crearResidente(4),
      crearResidente(5),
    ]);
    await db.usuarioUnidad.createMany({
      data: [
        { userId: residentes[0], unidadId: unidades[0] },
        { userId: residentes[1], unidadId: unidades[1] },
        { userId: residentes[2], unidadId: unidades[2] },
        { userId: residentes[3], unidadId: unidades[3] },
        { userId: residentes[4], unidadId: unidades[4] },
      ],
    });

    const fecha = (dia: string) => new Date(`${dia}T00:00:00.000Z`);
    const crearCuota = async (
      unidadId: string,
      vencimiento: string,
      estado: 'PENDIENTE' | 'PAGADA' = 'PENDIENTE',
    ) => {
      const cuota = await db.cuota.create({
        data: {
          unidadId,
          periodo: '2026-12',
          monto: '50.00',
          fechaVencimiento: fecha(vencimiento),
          estado,
          ...(estado === 'PAGADA' ? { fechaPago: fecha('2026-12-01') } : {}),
        },
      });
      cuotaIds.push(cuota.id);
      return cuota.id;
    };

    cuotaEsperadaId = await crearCuota(unidades[0], '2027-01-02');
    cuotaFallaId = await crearCuota(unidades[1], '2027-01-02');
    cuotaPagadaId = await crearCuota(unidades[2], '2027-01-02', 'PAGADA');
    cuotaDosDiasId = await crearCuota(unidades[3], '2027-01-01');
    cuotaCuatroDiasId = await crearCuota(unidades[4], '2027-01-03');
    cuotaSinResidenteId = await crearCuota(unidades[5], '2027-01-02');
  }, 30000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (db) {
      await db.notificacion.deleteMany({
        where: { userId: { in: userIds } },
      });
      await db.cuota.deleteMany({ where: { id: { in: cuotaIds } } });
      await db.usuarioUnidad.deleteMany({
        where: { userId: { in: userIds } },
      });
      await db.unidad.deleteMany({ where: { id: { in: unidadIds } } });
      if (seccionId) await db.seccion.delete({ where: { id: seccionId } });
      if (torreId) await db.torre.delete({ where: { id: torreId } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app?.close();
  }, 30000);

  it('selecciona el día exacto, reintenta fallos y deduplica ejecuciones simultáneas', async () => {
    const ejecutarAntesDeMedianocheLocal = new Date('2026-12-31T05:59:00.000Z');
    const crearReal = notificaciones.crear.bind(notificaciones);
    vi.spyOn(notificaciones, 'crear').mockImplementation((datos) => {
      if (datos.referenciaId === cuotaFallaId) {
        throw new Error('Fallo temporal de notificaciones');
      }
      return crearReal(datos);
    });

    await job.ejecutar(ejecutarAntesDeMedianocheLocal);
    const trasFallo = await db.notificacion.findMany({
      where: { referenciaId: { in: cuotaIds } },
      select: { userId: true, referenciaId: true, claveEvento: true },
    });
    expect(trasFallo).toHaveLength(1);
    expect(trasFallo[0]).toMatchObject({
      referenciaId: cuotaEsperadaId,
      claveEvento: `CUOTA_POR_VENCER:${cuotaEsperadaId}`,
    });
    vi.restoreAllMocks();

    await Promise.all([
      job.ejecutar(ejecutarAntesDeMedianocheLocal),
      job.ejecutar(ejecutarAntesDeMedianocheLocal),
    ]);
    const trasReintento = await db.notificacion.findMany({
      where: { referenciaId: { in: cuotaIds } },
      select: { userId: true, referenciaId: true, claveEvento: true },
    });
    expect(trasReintento).toHaveLength(2);
    expect(
      trasReintento
        .map(({ referenciaId }) => referenciaId)
        .sort((primero, segundo) => primero!.localeCompare(segundo!)),
    ).toEqual(
      [cuotaEsperadaId, cuotaFallaId].sort((primero, segundo) =>
        primero.localeCompare(segundo),
      ),
    );
    expect(
      trasReintento.every(
        (aviso) =>
          aviso.claveEvento === `CUOTA_POR_VENCER:${aviso.referenciaId}`,
      ),
    ).toBe(true);
    expect(
      trasReintento.some(({ referenciaId }) =>
        [
          cuotaPagadaId,
          cuotaDosDiasId,
          cuotaCuatroDiasId,
          cuotaSinResidenteId,
        ].includes(referenciaId!),
      ),
    ).toBe(false);

    // A las 06:00 UTC comienza el 31 de diciembre en El Salvador; el 3 de enero
    // pasa a ser exactamente tres días después y la cuota se procesa entonces.
    await job.ejecutar(new Date('2026-12-31T06:00:00.000Z'));
    const alCambiarElDiaLocal = await db.notificacion.findMany({
      where: { referenciaId: { in: cuotaIds } },
      select: { referenciaId: true },
    });
    expect(alCambiarElDiaLocal).toHaveLength(3);
    expect(
      alCambiarElDiaLocal.map(({ referenciaId }) => referenciaId),
    ).toContain(cuotaCuatroDiasId);
  });

  it('envía INCIDENCIA_RESUELTA solo al autor y aparece en la bandeja H27', async () => {
    const autor = await db.user.findUniqueOrThrow({
      where: { email: `${prefijo}-1@test.invalid` },
    });
    const vecino = await db.user.findUniqueOrThrow({
      where: { email: `${prefijo}-2@test.invalid` },
    });
    const noLeidasAutorAntes = await db.notificacion.count({
      where: { userId: autor.id, estado: 'NO_LEIDA' },
    });
    const noLeidasVecinoAntes = await db.notificacion.count({
      where: { userId: vecino.id, estado: 'NO_LEIDA' },
    });
    const incidenciaId = randomUUID();
    const aviso = {
      destinatario: { tipo: 'USUARIO' as const, id: autor.id },
      tipoEvento: 'INCIDENCIA_RESUELTA' as const,
      moduloOrigen: 'INCIDENCIAS' as const,
      titulo: 'Tu incidencia fue resuelta',
      mensaje: 'Tu incidencia INC-0001 fue resuelta.',
      referenciaId: incidenciaId,
      claveEvento: `INCIDENCIA_RESUELTA:${incidenciaId}`,
    };

    await expect(notificaciones.crear(aviso)).resolves.toEqual({ creadas: 1 });
    await expect(notificaciones.crear(aviso)).resolves.toEqual({ creadas: 0 });

    const token = (user: typeof autor) =>
      `Bearer ${jwt.sign({ sub: user.id, email: user.email })}`;
    const inboxAutor = await request(app.getHttpServer())
      .get('/api/v1/notificaciones/mias?moduloOrigen=INCIDENCIAS')
      .set('Authorization', token(autor))
      .expect(200);
    expect(inboxAutor.body).toMatchObject({
      total: 1,
      noLeidas: noLeidasAutorAntes + 1,
    });
    expect(inboxAutor.body.datos).toEqual([
      expect.objectContaining({
        tipoEvento: 'INCIDENCIA_RESUELTA',
        moduloOrigen: 'INCIDENCIAS',
        titulo: aviso.titulo,
        mensaje: aviso.mensaje,
        referenciaId: incidenciaId,
        estado: 'NO_LEIDA',
      }),
    ]);

    const inboxVecino = await request(app.getHttpServer())
      .get('/api/v1/notificaciones/mias?moduloOrigen=INCIDENCIAS')
      .set('Authorization', token(vecino))
      .expect(200);
    expect(inboxVecino.body).toMatchObject({
      datos: [],
      total: 0,
      noLeidas: noLeidasVecinoAntes,
    });
  });

  it('deduplica V07 con llamadas parciales, repetidas y simultáneas', async () => {
    const residentes = await db.user.findMany({
      where: {
        email: { startsWith: prefijo },
        rol: 'RESIDENTE',
        isActive: true,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    expect(residentes).toHaveLength(5);

    const claveEvento = `V07:${randomUUID()}`;
    const referenciaId = randomUUID();
    const contenido = {
      tipoEvento: 'INCIDENCIA_RESUELTA' as const,
      moduloOrigen: 'INCIDENCIAS' as const,
      titulo: 'Aviso V07',
      mensaje: 'Prueba de deduplicación masiva.',
      referenciaId,
      claveEvento,
    };
    const primerDestinatario = {
      ...contenido,
      destinatario: { tipo: 'USUARIO' as const, id: residentes[0].id },
    };

    await expect(notificaciones.crear(primerDestinatario)).resolves.toEqual({
      creadas: 1,
    });
    await expect(notificaciones.crear(primerDestinatario)).resolves.toEqual({
      creadas: 0,
    });
    const avisoLeido = await db.notificacion.findFirstOrThrow({
      where: { userId: residentes[0].id, claveEvento },
    });
    const leidaAt = new Date('2026-11-12T12:00:00.000Z');
    await db.notificacion.update({
      where: { id: avisoLeido.id },
      data: { estado: 'LEIDA', leidaAt },
    });

    const paraTodos = {
      ...contenido,
      destinatario: { tipo: 'TODOS' as const },
    };
    const resultadosConcurrentes = await Promise.all([
      notificaciones.crear(paraTodos),
      notificaciones.crear(paraTodos),
    ]);
    expect(
      resultadosConcurrentes.reduce(
        (suma, resultado) => suma + resultado.creadas,
        0,
      ),
    ).toBe(4);
    await expect(notificaciones.crear(paraTodos)).resolves.toEqual({
      creadas: 0,
    });

    const filas = await db.notificacion.findMany({
      where: { claveEvento },
      orderBy: { userId: 'asc' },
    });
    expect(filas).toHaveLength(5);
    expect(filas.map(({ userId }) => userId)).toEqual(
      residentes.map(({ id }) => id),
    );
    expect(filas[0]).toMatchObject({ estado: 'LEIDA', leidaAt });
  });

  it('no expone una ruta pública para crear avisos en OpenAPI', () => {
    const documento = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('H28 e2e').setVersion('1').build(),
    );
    expect(documento.paths['/api/v1/notificaciones']).toBeUndefined();
    expect(documento.paths['/api/v1/notificaciones/mias']?.get).toBeDefined();
    expect(
      documento.paths['/api/v1/notificaciones/{id}/lectura']?.patch,
    ).toBeDefined();
  });
});
