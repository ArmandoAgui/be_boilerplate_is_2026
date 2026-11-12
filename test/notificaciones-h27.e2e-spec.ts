import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService as Db } from '../src/prisma/services/prisma.service.js';

const testUrl = process.env.TEST_DATABASE_URL;
if (testUrl && !new URL(testUrl).pathname.endsWith('_test')) {
  throw new Error('H27 requiere TEST_DATABASE_URL con una base aislada _test.');
}

const jwtSecret = 'h27-notificaciones-pruebas-aisladas-2026-clave-segura';

describe.skipIf(!testUrl)(
  'H27 bandeja de notificaciones (HTTP + PostgreSQL)',
  () => {
    let app: INestApplication;
    let db: Db;
    let jwt: JwtService;

    const ids = {
      residente: randomUUID(),
      vecino: randomUUID(),
      admin: randomUUID(),
      seguridad: randomUUID(),
      inactivo: randomUUID(),
      eliminado: randomUUID(),
      torre: randomUUID(),
      seccion: randomUUID(),
      unidad: randomUUID(),
    };
    const tokens: Record<string, string> = {};
    const createdNotifications = new Set<string>();
    const http = () => request(app.getHttpServer());
    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

    beforeAll(async () => {
      // La URL de prueba se asigna antes de importar AppModule para que Prisma
      // no pueda capturar por accidente la conexión de desarrollo.
      process.env.DATABASE_URL = testUrl!;
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = jwtSecret;

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
      db = app.get(PrismaService);
      jwt = app.get(JwtService);

      const fixtureUsers = [
        {
          id: ids.residente,
          name: 'residente',
          role: 'RESIDENTE',
          active: true,
        },
        { id: ids.vecino, name: 'vecino', role: 'RESIDENTE', active: true },
        { id: ids.admin, name: 'admin', role: 'ADMINISTRADOR', active: true },
        {
          id: ids.seguridad,
          name: 'seguridad',
          role: 'SEGURIDAD',
          active: true,
        },
        {
          id: ids.inactivo,
          name: 'inactivo',
          role: 'RESIDENTE',
          active: false,
        },
        {
          id: ids.eliminado,
          name: 'eliminado',
          role: 'RESIDENTE',
          active: true,
        },
      ] as const;
      for (const fixture of fixtureUsers) {
        const user = await db.user.create({
          data: {
            id: fixture.id,
            email: `${fixture.id}@h27.test.invalid`,
            passwordHash: 'e2e-only',
            nombre: fixture.name,
            rol: fixture.role,
            isActive: fixture.active,
          },
        });
        tokens[fixture.name] = jwt.sign({ sub: user.id, email: user.email });
      }
      // Se conserva un JWT válido en firma para comprobar que una cuenta
      // eliminada deja de autorizar solicitudes sin esperar a su expiración.
      await db.user.delete({ where: { id: ids.eliminado } });

      await db.torre.create({
        data: { id: ids.torre, nombre: `H27-${ids.torre.slice(0, 8)}` },
      });
      await db.seccion.create({
        data: { id: ids.seccion, torreId: ids.torre, nombre: 'H27' },
      });
      await db.unidad.create({
        data: {
          id: ids.unidad,
          codigo: ids.unidad,
          torreId: ids.torre,
          seccionId: ids.seccion,
          cuotaMensual: 50,
        },
      });
      await db.usuarioUnidad.createMany({
        data: [
          { userId: ids.residente, unidadId: ids.unidad },
          { userId: ids.vecino, unidadId: ids.unidad },
        ],
      });
    }, 30000);

    afterEach(async () => {
      if (createdNotifications.size) {
        await db.notificacion.deleteMany({
          where: { id: { in: [...createdNotifications] } },
        });
        createdNotifications.clear();
      }
    });

    afterAll(async () => {
      if (db) {
        await db.notificacion.deleteMany({
          where: { userId: { in: [ids.residente, ids.vecino] } },
        });
        await db.usuarioUnidad.deleteMany({
          where: { userId: { in: [ids.residente, ids.vecino] } },
        });
        await db.unidad.deleteMany({ where: { id: ids.unidad } });
        await db.seccion.deleteMany({ where: { id: ids.seccion } });
        await db.torre.deleteMany({ where: { id: ids.torre } });
        await db.user.deleteMany({
          where: {
            id: {
              in: [
                ids.residente,
                ids.vecino,
                ids.admin,
                ids.seguridad,
                ids.inactivo,
              ],
            },
          },
        });
      }
      await app?.close();
    });

    async function crearAviso(
      userId = ids.residente,
      options: {
        id?: string;
        key?: string;
        module?:
          'CUOTAS' | 'PAQUETERIA' | 'COMUNICADOS' | 'ASAMBLEAS' | 'INCIDENCIAS';
        event?:
          | 'CUOTA_POR_VENCER'
          | 'PAQUETE_RECIBIDO'
          | 'COMUNICADO_NUEVO'
          | 'VOTACION_ABIERTA'
          | 'INCIDENCIA_RESUELTA';
        estado?: 'NO_LEIDA' | 'LEIDA';
        leidaAt?: Date | null;
        referenciaId?: string | null;
        createdAt?: Date;
      } = {},
    ) {
      const id = options.id ?? randomUUID();
      const created = await db.notificacion.create({
        data: {
          id,
          userId,
          moduloOrigen: options.module ?? 'INCIDENCIAS',
          tipoEvento: options.event ?? 'INCIDENCIA_RESUELTA',
          titulo: 'Aviso H27',
          mensaje: 'Detalle de prueba H27',
          referenciaId: options.referenciaId ?? null,
          claveEvento: options.key ?? `H27:${randomUUID()}`,
          ...(options.estado ? { estado: options.estado } : {}),
          ...(options.leidaAt !== undefined
            ? { leidaAt: options.leidaAt }
            : {}),
          ...(options.createdAt ? { createdAt: options.createdAt } : {}),
        },
      });
      createdNotifications.add(created.id);
      return created;
    }

    it('valida sesión vigente, rol Residente activo y privacidad entre vecinos', async () => {
      const propio = await crearAviso();
      await crearAviso();
      const ajeno = await crearAviso(ids.vecino);

      await http().get('/api/v1/notificaciones/mias').expect(401);
      await http()
        .get('/api/v1/notificaciones/mias')
        .set(auth('token-invalido'))
        .expect(401);
      await http()
        .get('/api/v1/notificaciones/mias')
        .set(
          auth(
            jwt.sign(
              { sub: ids.residente, email: 'expired@invalid' },
              { expiresIn: -1 },
            ),
          ),
        )
        .expect(401);
      await http()
        .get('/api/v1/notificaciones/mias')
        .set(auth(tokens.inactivo))
        .expect(401);
      await http()
        .get('/api/v1/notificaciones/mias')
        .set(auth(tokens.eliminado))
        .expect(401);

      for (const role of ['admin', 'seguridad']) {
        await http()
          .get('/api/v1/notificaciones/mias')
          .set(auth(tokens[role]))
          .expect(403);
        await http()
          .patch(`/api/v1/notificaciones/${propio.id}/lectura`)
          .set(auth(tokens[role]))
          .expect(403);
      }

      const listaVecino = await http()
        .get('/api/v1/notificaciones/mias')
        .set(auth(tokens.vecino))
        .expect(200);
      expect(
        listaVecino.body.datos.map((aviso: { id: string }) => aviso.id),
      ).toEqual([ajeno.id]);
      expect(listaVecino.body.noLeidas).toBe(1);
      const listaPropia = await http()
        .get('/api/v1/notificaciones/mias')
        .set(auth(tokens.residente))
        .expect(200);
      expect(listaPropia.body.noLeidas).toBe(2);
      const foreign = await http()
        .patch(`/api/v1/notificaciones/${ajeno.id}/lectura`)
        .set(auth(tokens.residente))
        .expect(404);
      const missing = await http()
        .patch(`/api/v1/notificaciones/${randomUUID()}/lectura`)
        .set(auth(tokens.residente))
        .expect(404);
      expect(foreign.body).toEqual(missing.body);
      expect(
        await db.notificacion.findUniqueOrThrow({ where: { id: ajeno.id } }),
      ).toMatchObject({ estado: 'NO_LEIDA', leidaAt: null });
    });

    it('valida filtros, defaults, parámetros extra o repetidos y rangos', async () => {
      await crearAviso(ids.residente, { module: 'COMUNICADOS' });
      const base = http()
        .get('/api/v1/notificaciones/mias')
        .set(auth(tokens.residente));
      const defaults = await base.expect(200);
      expect(defaults.body).toMatchObject({
        noLeidas: 1,
        total: 1,
        pagina: 1,
        tamanoPagina: 20,
      });

      await http()
        .get(
          '/api/v1/notificaciones/mias?moduloOrigen=COMUNICADOS&estado=NO_LEIDA&pagina=1&tamanoPagina=1',
        )
        .set(auth(tokens.residente))
        .expect(200);
      for (const query of [
        '?desconocido=1',
        '?estado=NO_LEIDA&estado=LEIDA',
        '?moduloOrigen=CUOTAS&moduloOrigen=COMUNICADOS',
        '?estado=ABIERTA',
        '?pagina=0',
        '?pagina=1.5',
        '?pagina=9007199254740992',
        '?tamanoPagina=0',
        '?tamanoPagina=51',
      ]) {
        await http()
          .get(`/api/v1/notificaciones/mias${query}`)
          .set(auth(tokens.residente))
          .expect(400);
      }

      await http()
        .patch('/api/v1/notificaciones/no-es-uuid/lectura')
        .set(auth(tokens.residente))
        .expect(404);
    });

    it('ordena por fecha e ID, pagina 20 por defecto y mantiene el contador global', async () => {
      const base = Date.parse('2026-09-01T12:00:00.000Z');
      const tieDate = new Date(base + 100_000);
      const tieLow = '00000000-0000-4000-8000-000000000001';
      const tieHigh = '00000000-0000-4000-8000-000000000002';
      const all: Array<{
        id: string;
        createdAt: Date;
        module: string;
        state: string;
      }> = [];

      for (let index = 0; index < 23; index += 1) {
        const id = index === 0 ? tieLow : index === 1 ? tieHigh : randomUUID();
        const createdAt = index < 2 ? tieDate : new Date(base + index * 1_000);
        const module = index < 5 ? 'COMUNICADOS' : 'INCIDENCIAS';
        const state = index === 4 || index === 5 ? 'LEIDA' : 'NO_LEIDA';
        await crearAviso(ids.residente, {
          id,
          createdAt,
          module: module as 'COMUNICADOS' | 'INCIDENCIAS',
          estado: state as 'NO_LEIDA' | 'LEIDA',
          leidaAt: state === 'LEIDA' ? new Date(base + 60_000) : null,
          referenciaId: index === 0 ? null : randomUUID(),
        });
        all.push({ id, createdAt, module, state });
      }
      await crearAviso(ids.vecino);

      const beforeReads = await db.notificacion.findMany({
        where: { userId: ids.residente },
        select: { id: true, estado: true, leidaAt: true },
        orderBy: { id: 'asc' },
      });

      const ordered = [...all].sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          (b.id > a.id ? 1 : b.id < a.id ? -1 : 0),
      );
      const first = await http()
        .get('/api/v1/notificaciones/mias')
        .set(auth(tokens.residente))
        .expect(200);
      expect(first.body).toMatchObject({
        noLeidas: 21,
        total: 23,
        pagina: 1,
        tamanoPagina: 20,
      });
      expect(first.body.datos.map((row: { id: string }) => row.id)).toEqual(
        ordered.slice(0, 20).map((row) => row.id),
      );
      expect(first.body.datos[0].id).toBe(tieHigh);
      expect(first.body.datos[0]).not.toHaveProperty('userId');
      expect(first.body.datos[0]).not.toHaveProperty('claveEvento');
      expect(
        first.body.datos.find((row: { id: string }) => row.id === tieLow)
          .referenciaId,
      ).toBeNull();

      const second = await http()
        .get('/api/v1/notificaciones/mias?pagina=2')
        .set(auth(tokens.residente))
        .expect(200);
      expect(second.body.datos.map((row: { id: string }) => row.id)).toEqual(
        ordered.slice(20).map((row) => row.id),
      );
      expect(second.body.noLeidas).toBe(21);

      const filtered = await http()
        .get(
          '/api/v1/notificaciones/mias?moduloOrigen=COMUNICADOS&estado=NO_LEIDA',
        )
        .set(auth(tokens.residente))
        .expect(200);
      expect(filtered.body).toMatchObject({ total: 4, noLeidas: 21 });
      expect(filtered.body.datos).toHaveLength(4);

      const empty = await http()
        .get('/api/v1/notificaciones/mias?pagina=99')
        .set(auth(tokens.residente))
        .expect(200);
      expect(empty.body).toMatchObject({
        datos: [],
        total: 23,
        noLeidas: 21,
        pagina: 99,
      });

      const rowsAfterRead = await db.notificacion.findMany({
        where: { userId: ids.residente },
        select: { id: true, estado: true, leidaAt: true },
        orderBy: { id: 'asc' },
      });
      expect(rowsAfterRead).toEqual(beforeReads);
      expect(
        rowsAfterRead.filter((row) => row.estado === 'LEIDA'),
      ).toHaveLength(2);
      expect(
        rowsAfterRead.filter(
          (row) => row.estado === 'NO_LEIDA' && row.leidaAt === null,
        ),
      ).toHaveLength(21);
    });

    it('marca como leída una vez; repeticiones y concurrencia conservan la misma fecha', async () => {
      const aviso = await crearAviso();
      const path = `/api/v1/notificaciones/${aviso.id}/lectura`;
      const results = await Promise.all([
        http().patch(path).set(auth(tokens.residente)),
        http().patch(path).set(auth(tokens.residente)),
      ]);
      for (const result of results) expect(result.status).toBe(200);
      expect(results[0].body).toEqual(results[1].body);
      expect(results[0].body).toMatchObject({ id: aviso.id, estado: 'LEIDA' });
      expect(new Date(results[0].body.leidaAt).toISOString()).toBe(
        results[0].body.leidaAt,
      );

      const again = await http()
        .patch(path)
        .set(auth(tokens.residente))
        .expect(200);
      expect(again.body.leidaAt).toBe(results[0].body.leidaAt);
      const stored = await db.notificacion.findUniqueOrThrow({
        where: { id: aviso.id },
      });
      expect(stored).toMatchObject({
        estado: 'LEIDA',
        leidaAt: new Date(results[0].body.leidaAt),
      });

      const inbox = await http()
        .get('/api/v1/notificaciones/mias?estado=LEIDA')
        .set(auth(tokens.residente))
        .expect(200);
      expect(inbox.body).toMatchObject({ total: 1, noLeidas: 0 });
    });

    it('respeta defaults, FK, unicidad por destinatario y CHECK estado/fecha', async () => {
      const defaulted = await crearAviso(ids.residente, { referenciaId: null });
      expect(defaulted).toMatchObject({
        estado: 'NO_LEIDA',
        leidaAt: null,
        referenciaId: null,
      });

      const key = `H27:dedupe:${randomUUID()}`;
      const unique = await crearAviso(ids.residente, { key });
      await expect(crearAviso(ids.residente, { key })).rejects.toMatchObject({
        code: 'P2002',
      });
      const sameKeyForOtherUser = await crearAviso(ids.vecino, { key });
      expect(sameKeyForOtherUser.claveEvento).toBe(unique.claveEvento);

      await expect(
        db.notificacion.create({
          data: {
            userId: randomUUID(),
            moduloOrigen: 'INCIDENCIAS',
            tipoEvento: 'INCIDENCIA_RESUELTA',
            titulo: 'FK',
            mensaje: 'FK',
            claveEvento: `H27:fk:${randomUUID()}`,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });

      const invalidId = randomUUID();
      await expect(
        db.$executeRaw`
        INSERT INTO "notificaciones"
          ("id", "user_id", "modulo_origen", "tipo_evento", "titulo", "mensaje", "clave_evento", "estado", "leida_at")
        VALUES
          (${invalidId}::uuid, ${ids.residente}::uuid, 'INCIDENCIAS'::"ModuloOrigen", 'INCIDENCIA_RESUELTA'::"TipoEvento", 'CHECK', 'CHECK', ${`H27:check:${randomUUID()}`}, 'LEIDA'::"EstadoNotificacion", NULL)
      `,
      ).rejects.toBeDefined();
      expect(
        await db.notificacion.findUnique({ where: { id: invalidId } }),
      ).toBeNull();
    });
  },
);
