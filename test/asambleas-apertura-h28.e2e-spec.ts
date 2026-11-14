import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { PrismaService as Db } from '../src/prisma/services/prisma.service.js';

const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL debe apuntar a una BD aislada _test');
}

describe.skipIf(!url)('H28 · avisos de apertura de votación', () => {
  let app: INestApplication;
  let db: Db;
  let job: { ejecutar: (ahora: Date) => Promise<void> };
  let notificaciones: {
    crearAvisoVotacionAbierta: (
      temaId: string,
      ahora: Date,
    ) => Promise<{ creadas: number }>;
  };
  const prefijo = `h28-apertura-${randomUUID()}`;
  const userIds: string[] = [];
  const unidadIds: string[] = [];
  const asambleaIds: string[] = [];
  const temaIds: string[] = [];
  const triggerSufijo = randomUUID().replaceAll('-', '');
  const triggerNombre = `h28_falla_${triggerSufijo}`;
  const funcionNombre = `h28_funcion_${triggerSufijo}`;
  let torreId: string;
  let seccionId: string;
  let temaValidoId: string;
  let temaBorradorId: string;
  let temaFuturoId: string;
  let temaCerradoId: string;
  let temaProcesadoId: string;
  let temaFallaId: string;
  let temaSinAudienciaId: string;
  let residenteId: string;
  let unidadActivaUnoId: string;
  let unidadActivaDosId: string;
  let unidadInactivaId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'h28-apertura-e2e-secret-largo-aislado';
    process.env.NODE_ENV = 'test';

    const { AppModule } = await import('../dist/app.module.js');
    const { PrismaService } =
      await import('../dist/prisma/services/prisma.service.js');
    const { AbrirVotacionesJob } =
      await import('../dist/asambleas/abrir-votaciones.job.js');
    const { NotificacionesService } =
      await import('../dist/notificaciones/services/notificaciones.service.js');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    db = app.get(PrismaService);
    job = app.get(AbrirVotacionesJob);
    notificaciones = app.get(NotificacionesService);

    const sufijo = randomUUID().slice(0, 20);
    const torre = await db.torre.create({ data: { nombre: `H28-${sufijo}` } });
    torreId = torre.id;
    const seccion = await db.seccion.create({
      data: { nombre: `S-${sufijo}`, torreId },
    });
    seccionId = seccion.id;

    const crearUnidad = async (indice: number, activa = true) => {
      const unidad = await db.unidad.create({
        data: {
          codigo: `${prefijo}-${indice}`,
          torreId,
          seccionId,
          cuotaMensual: '50.00',
          activa,
        },
      });
      unidadIds.push(unidad.id);
      return unidad.id;
    };
    [unidadActivaUnoId, unidadActivaDosId, unidadInactivaId] =
      await Promise.all([
        crearUnidad(1),
        crearUnidad(2),
        crearUnidad(3, false),
      ]);

    const crearUsuario = async (
      indice: number,
      rol: 'RESIDENTE' | 'ADMINISTRADOR' = 'RESIDENTE',
      isActive = true,
    ) => {
      const user = await db.user.create({
        data: {
          email: `${prefijo}-${indice}@test.invalid`,
          passwordHash: 'solo-prueba',
          nombre: `H28 ${indice}`,
          rol,
          isActive,
        },
      });
      userIds.push(user.id);
      return user.id;
    };
    residenteId = await crearUsuario(1);
    const residenteSinUnidadActivaId = await crearUsuario(2);
    const residenteInactivoId = await crearUsuario(3, 'RESIDENTE', false);
    const administradorId = await crearUsuario(4, 'ADMINISTRADOR');
    await db.usuarioUnidad.createMany({
      data: [
        { userId: residenteId, unidadId: unidadActivaUnoId },
        { userId: residenteId, unidadId: unidadActivaDosId },
        {
          userId: residenteSinUnidadActivaId,
          unidadId: unidadInactivaId,
        },
        { userId: residenteInactivoId, unidadId: unidadActivaUnoId },
      ],
    });

    const asambleaPublicada = await db.asamblea.create({
      data: {
        titulo: `Publicada ${sufijo}`,
        fechaAt: new Date('2027-01-01T00:00:00.000Z'),
        estado: 'PUBLICADA',
        publicadaAt: new Date('2026-12-01T00:00:00.000Z'),
        creadorId: administradorId,
      },
    });
    asambleaIds.push(asambleaPublicada.id);
    const asambleaBorrador = await db.asamblea.create({
      data: {
        titulo: `Borrador ${sufijo}`,
        fechaAt: new Date('2027-01-01T00:00:00.000Z'),
        estado: 'BORRADOR',
        creadorId: administradorId,
      },
    });
    asambleaIds.push(asambleaBorrador.id);

    const ahora = new Date('2027-01-01T12:00:00.000Z');
    const crearTema = async (
      asambleaId: string,
      nombre: string,
      aperturaAt: Date,
      cierreAt: Date,
      notificadoApertura = false,
    ) => {
      const tema = await db.temaVotacion.create({
        data: {
          asambleaId,
          pregunta: `${nombre} ${sufijo}`,
          aperturaAt,
          cierreAt,
          notificadoApertura,
        },
      });
      temaIds.push(tema.id);
      return tema.id;
    };
    temaValidoId = await crearTema(
      asambleaPublicada.id,
      'Apertura límite',
      ahora,
      ahora,
    );
    temaBorradorId = await crearTema(
      asambleaBorrador.id,
      'Asamblea borrador',
      new Date(ahora.getTime() - 60_000),
      new Date(ahora.getTime() + 60_000),
    );
    temaFuturoId = await crearTema(
      asambleaPublicada.id,
      'Apertura futura',
      new Date(ahora.getTime() + 1),
      new Date(ahora.getTime() + 60_000),
    );
    temaCerradoId = await crearTema(
      asambleaPublicada.id,
      'Tema cerrado',
      new Date(ahora.getTime() - 60_000),
      new Date(ahora.getTime() - 1),
    );
    temaProcesadoId = await crearTema(
      asambleaPublicada.id,
      'Ya procesado',
      new Date(ahora.getTime() - 60_000),
      new Date(ahora.getTime() + 60_000),
      true,
    );
    const opcion = await db.opcionVoto.create({
      data: { temaId: temaValidoId, texto: 'Sí' },
    });
    await db.participacionVoto.create({
      data: { temaId: temaValidoId, unidadId: unidadActivaUnoId },
    });
    await db.voto.create({
      data: { temaId: temaValidoId, opcionId: opcion.id },
    });
  }, 30000);

  afterAll(async () => {
    if (db) {
      await quitarTriggerDeFallo();
      await db.notificacion.deleteMany({ where: { userId: { in: userIds } } });
      await db.voto.deleteMany({ where: { temaId: { in: temaIds } } });
      await db.participacionVoto.deleteMany({
        where: { temaId: { in: temaIds } },
      });
      await db.opcionVoto.deleteMany({ where: { temaId: { in: temaIds } } });
      await db.temaVotacion.deleteMany({ where: { id: { in: temaIds } } });
      await db.asamblea.deleteMany({ where: { id: { in: asambleaIds } } });
      await db.usuarioUnidad.deleteMany({ where: { userId: { in: userIds } } });
      await db.unidad.deleteMany({ where: { id: { in: unidadIds } } });
      if (seccionId) await db.seccion.delete({ where: { id: seccionId } });
      if (torreId) await db.torre.delete({ where: { id: torreId } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app?.close();
  }, 30000);

  it('respeta elegibilidad, límites, deduplicación y conserva los datos de voto', async () => {
    const ahora = new Date('2027-01-01T12:00:00.000Z');
    const votosAntes = await db.voto.findMany({
      where: { temaId: temaValidoId },
    });
    const participacionesAntes = await db.participacionVoto.findMany({
      where: { temaId: temaValidoId },
    });

    await Promise.all([job.ejecutar(ahora), job.ejecutar(ahora)]);

    const avisoValido = await db.notificacion.findMany({
      where: { referenciaId: temaValidoId },
    });
    expect(avisoValido).toHaveLength(1);
    expect(avisoValido[0]).toMatchObject({
      userId: residenteId,
      moduloOrigen: 'ASAMBLEAS',
      tipoEvento: 'VOTACION_ABIERTA',
      titulo: 'Votación abierta',
      referenciaId: temaValidoId,
      claveEvento: `VOTACION_ABIERTA:${temaValidoId}`,
    });
    expect(avisoValido[0].mensaje).toContain('Apertura límite');

    const temas = await db.temaVotacion.findMany({
      where: {
        id: {
          in: [
            temaValidoId,
            temaBorradorId,
            temaFuturoId,
            temaCerradoId,
            temaProcesadoId,
          ],
        },
      },
      select: { id: true, notificadoApertura: true },
    });
    const porId = new Map(
      temas.map((tema) => [tema.id, tema.notificadoApertura]),
    );
    expect(porId.get(temaValidoId)).toBe(true);
    expect(porId.get(temaProcesadoId)).toBe(true);
    expect(porId.get(temaBorradorId)).toBe(false);
    expect(porId.get(temaFuturoId)).toBe(false);
    expect(porId.get(temaCerradoId)).toBe(false);
    expect(
      await db.notificacion.count({
        where: {
          referenciaId: {
            in: [temaBorradorId, temaFuturoId, temaCerradoId, temaProcesadoId],
          },
        },
      }),
    ).toBe(0);

    expect(await db.voto.findMany({ where: { temaId: temaValidoId } })).toEqual(
      votosAntes,
    );
    expect(
      await db.participacionVoto.findMany({ where: { temaId: temaValidoId } }),
    ).toEqual(participacionesAntes);
  });

  it('revierte la marca y los avisos si falla la inserción y permite reintentar', async () => {
    temaFallaId = await crearTemaAdicional('Fallo transaccional');
    await instalarTriggerDeFallo();
    await expect(
      notificaciones.crearAvisoVotacionAbierta(
        temaFallaId,
        new Date('2027-01-01T12:00:00.000Z'),
      ),
    ).rejects.toThrow();
    await quitarTriggerDeFallo();

    expect(
      await db.temaVotacion.findUnique({
        where: { id: temaFallaId },
        select: { notificadoApertura: true },
      }),
    ).toMatchObject({ notificadoApertura: false });
    expect(
      await db.notificacion.count({ where: { referenciaId: temaFallaId } }),
    ).toBe(0);

    await job.ejecutar(new Date('2027-01-01T12:00:00.000Z'));
    expect(
      await db.temaVotacion.findUnique({
        where: { id: temaFallaId },
        select: { notificadoApertura: true },
      }),
    ).toMatchObject({ notificadoApertura: true });
    expect(
      await db.notificacion.count({ where: { referenciaId: temaFallaId } }),
    ).toBe(1);
  });

  it('marca como procesado un tema válido cuando no hay residentes habilitados', async () => {
    temaSinAudienciaId = await crearTemaAdicional();
    await db.user.update({
      where: { id: residenteId },
      data: { isActive: false },
    });
    await db.unidad.updateMany({
      where: { id: { in: [unidadActivaUnoId, unidadActivaDosId] } },
      data: { activa: false },
    });

    await job.ejecutar(new Date('2027-01-01T12:00:00.000Z'));

    expect(
      await db.temaVotacion.findUnique({
        where: { id: temaSinAudienciaId },
        select: { notificadoApertura: true },
      }),
    ).toMatchObject({ notificadoApertura: true });
    expect(
      await db.notificacion.count({
        where: { referenciaId: temaSinAudienciaId },
      }),
    ).toBe(0);
  });

  async function crearTemaAdicional(nombre = 'Sin audiencia'): Promise<string> {
    const asamblea = await db.asamblea.findFirst({
      where: { id: { in: asambleaIds }, estado: 'PUBLICADA' },
      select: { id: true },
    });
    if (!asamblea) throw new Error('Falta la asamblea publicada de prueba.');
    const tema = await db.temaVotacion.create({
      data: {
        asambleaId: asamblea.id,
        pregunta: `${nombre} ${randomUUID().slice(0, 8)}`,
        aperturaAt: new Date('2027-01-01T11:59:00.000Z'),
        cierreAt: new Date('2027-01-01T12:01:00.000Z'),
      },
    });
    temaIds.push(tema.id);
    return tema.id;
  }

  async function instalarTriggerDeFallo(): Promise<void> {
    await db.$executeRawUnsafe(`
      CREATE FUNCTION "${funcionNombre}"() RETURNS trigger AS $$
      BEGIN
        IF NEW."referencia_id" = '${temaFallaId}'::uuid THEN
          RAISE EXCEPTION 'Fallo de prueba de inserción H28';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await db.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerNombre}"
      BEFORE INSERT ON "notificaciones"
      FOR EACH ROW EXECUTE FUNCTION "${funcionNombre}"();
    `);
  }

  async function quitarTriggerDeFallo(): Promise<void> {
    await db.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS "${triggerNombre}" ON "notificaciones";`,
    );
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${funcionNombre}"();`);
  }
});
