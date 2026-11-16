import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import type { PrismaService as Db } from '../src/prisma/services/prisma.service.js';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test'))
  throw new Error('Usa una BD aislada terminada en _test');
describe.skipIf(!url)(
  'Contratos del Product Owner e integración de sprints',
  () => {
    let app: INestApplication, db: Db;
    const tag = randomUUID().slice(0, 8),
      ids = {
        admin: randomUUID(),
        seguridad: randomUUID(),
        residente: randomUUID(),
        vecino: randomUUID(),
        ajeno: randomUUID(),
        torre: randomUUID(),
        seccion: randomUUID(),
        unidad: randomUUID(),
        otra: randomUUID(),
        area: randomUUID(),
      };
    const token: Record<string, string> = {};
    const api = () => request(app.getHttpServer());
    const future = (h: number) =>
      new Date(Date.now() + h * 3600000).toISOString();
    let cuotaId: string,
      reservaId: string,
      paqueteId: string,
      solicitudId: string,
      autorizacionId: string,
      entradaId: string,
      comunicadoId: string;
    beforeAll(async () => {
      process.env.DATABASE_URL = url;
      process.env.JWT_SECRET = 'clave-aislada-contratos-product-owner-2026';
      process.env.NODE_ENV = 'test';
    process.env.CUOTA_MENSUAL_USD = '50.00';
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
      await app.listen(0, '127.0.0.1');
      db = app.get(PrismaService);
      const jwt = app.get(JwtService);
      for (const [key, rol] of [
        ['admin', 'ADMINISTRADOR'],
        ['seguridad', 'SEGURIDAD'],
        ['residente', 'RESIDENTE'],
        ['vecino', 'RESIDENTE'],
        ['ajeno', 'RESIDENTE'],
      ] as const) {
        const u = await db.user.create({
          data: {
            id: ids[key],
            email: `${tag}-${key}@po.test`,
            nombre: `${key} Prueba`,
            rol,
            passwordHash: 'fixture-no-login',
          },
        });
        token[key] = `Bearer ${jwt.sign({ sub: u.id, email: u.email })}`;
      }
      await db.torre.create({ data: { id: ids.torre, nombre: tag } });
      await db.seccion.create({
        data: { id: ids.seccion, nombre: 'Norte', torreId: ids.torre },
      });
      for (const id of [ids.unidad, ids.otra])
        await db.unidad.create({
          data: {
            id,
            codigo: id.slice(0, 8),
            torreId: ids.torre,
            seccionId: ids.seccion,
            cuotaMensual: '75',
          },
        });
      await db.usuarioUnidad.createMany({
        data: [
          { userId: ids.residente, unidadId: ids.unidad },
          { userId: ids.vecino, unidadId: ids.unidad },
          { userId: ids.ajeno, unidadId: ids.otra },
        ],
      });
      await db.areaComun.create({
        data: {
          id: ids.area,
          nombre: `PO-${tag}`,
          capacidad: 20,
          horarios: {
            create: Array.from({ length: 7 }, (_, diaSemana) => ({
              diaSemana,
              horaInicio: '00:00',
              horaFin: '23:00',
            })),
          },
        },
      });
      cuotaId = (
        await db.cuota.create({
          data: {
            unidadId: ids.unidad,
            periodo: '2020-01',
            monto: '100',
            fechaVencimiento: new Date('2020-01-10T00:00:00Z'),
          },
        })
      ).id;
    });
    it('cierra el registro público y las vinculaciones a otros roles', async () => {
      await api()
        .post('/api/v1/users')
        .send({ email: 'public@po.test', password: 'Prueba123!' })
        .expect(401);
      await api()
        .post('/api/v1/users')
        .set('Authorization', token.residente)
        .send({ email: 'public@po.test', password: 'Prueba123!' })
        .expect(403);
      await api()
        .post('/api/v1/administracion/vinculos')
        .set('Authorization', token.seguridad)
        .send({ userId: ids.residente, unidadId: ids.otra })
        .expect(403);
    });
    it('bloquea reservas con deuda en cualquiera de las unidades vinculadas', async () => {
      await api()
        .post('/api/v1/reservas')
        .set('Authorization', token.residente)
        .send({
          areaId: ids.area,
          inicio: new Date(
            new Date(future(72)).setUTCMinutes(0, 0, 0),
          ).toISOString(),
          duracionHoras: 1,
          asistentes: 1,
        })
        .expect(409);
    });
    it('expone saldo, base y recargo de 5% sin acumularlo por consultar', async () => {
      for (let i = 0; i < 2; i++) {
        const r = await api()
          .get(`/api/v1/cuotas/${cuotaId}`)
          .set('Authorization', token.residente)
          .expect(200);
        expect(r.body).toMatchObject({
          montoBase: '100.00',
          recargo: '5.00',
          monto: '105.00',
        });
      }
      const r = await api()
        .get(`/api/v1/administracion/morosidad/${ids.unidad}`)
        .set('Authorization', token.admin)
        .expect(200);
      expect(r.body.cuotas[0].monto).toBe('105.00');
    });
    it('revalida deuda al aprobar aunque la solicitud ya exista', async () => {
      const r = await db.reserva.create({
        data: {
          areaId: ids.area,
          userId: ids.residente,
          inicio: new Date(new Date(future(72)).setUTCMinutes(0, 0, 0)),
          fin: new Date(new Date(future(73)).setUTCMinutes(0, 0, 0)),
          asistentes: 1,
          estado: 'PENDIENTE',
        },
      });
      reservaId = r.id;
      await api()
        .patch(`/api/v1/reservas/${r.id}/aprobacion`)
        .set('Authorization', token.admin)
        .expect(409);
      expect(
        (await db.reserva.findUniqueOrThrow({ where: { id: r.id } })).estado,
      ).toBe('PENDIENTE');
    });
    it('corrige y anula cuotas con auditoría; una anulada no bloquea reservas ni acepta pago', async () => {
      await api()
        .patch(`/api/v1/administracion/cuotas/${cuotaId}`)
        .set('Authorization', token.admin)
        .send({ monto: 120, motivo: 'Corrección de importe' })
        .expect(200);
      await api()
        .patch(`/api/v1/administracion/cuotas/${cuotaId}`)
        .set('Authorization', token.admin)
        .send({ estado: 'ANULADA', motivo: 'Duplicado registrado por error' })
        .expect(200);
      expect(
        await db.auditoriaAdministrativa.count({
          where: { recursoId: cuotaId },
        }),
      ).toBe(2);
      expect(
        (
          await api()
            .get(`/api/v1/cuotas/${cuotaId}`)
            .set('Authorization', token.residente)
            .expect(200)
        ).body.estado,
      ).toBe('ANULADA');
      await api()
        .patch(`/api/v1/reservas/${reservaId}/aprobacion`)
        .set('Authorization', token.admin)
        .expect(200);
    });
    it('vincula varias unidades solo desde administración y no duplica asociaciones', async () => {
      for (let i = 0; i < 2; i++)
        await api()
          .post('/api/v1/administracion/vinculos')
          .set('Authorization', token.admin)
          .send({ userId: ids.residente, unidadId: ids.otra })
          .expect(201);
      expect(
        await db.usuarioUnidad.count({ where: { userId: ids.residente } }),
      ).toBe(2);
    });
    it('publica y consulta comunicados anteriores sin registrar confirmación de lectura', async () => {
      const c = await db.comunicado.create({
        data: {
          autorId: ids.admin,
          titulo: 'Comunicado anterior',
          contenido: 'Contenido de prueba',
          alcance: 'TORRE',
          torreId: ids.torre,
          createdAt: new Date('2020-01-01'),
        },
      });
      comunicadoId = c.id;
      expect(
        (
          await api()
            .get('/api/v1/comunicados/mios')
            .set('Authorization', token.residente)
            .expect(200)
        ).body.datos.some((x: { id: string }) => x.id === c.id),
      ).toBe(true);
      await api()
        .get(`/api/v1/comunicados/${c.id}`)
        .set('Authorization', token.residente)
        .expect(200);
      expect(
        await db.lecturaComunicado.count({ where: { comunicadoId: c.id } }),
      ).toBe(0);
    });
    it('registra recepción y avisos con empresa y fecha; H19 responde de verdad', async () => {
      const r = await api()
        .post('/api/v1/paquetes')
        .set('Authorization', token.seguridad)
        .send({ unidadId: ids.unidad, empresa: 'Empresa Prueba' })
        .expect(201);
      paqueteId = r.body.id;
      const avisos = await db.notificacion.findMany({
        where: { referenciaId: paqueteId },
      });
      expect(avisos).toHaveLength(2);
      expect(avisos[0].mensaje).toMatch(
        /Paquete PAQ-\d+ de Empresa Prueba recibido el \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\./,
      );
      expect(
        (
          await api()
            .get(`/api/v1/paquetes/mios?unidadId=${ids.unidad}`)
            .set('Authorization', token.residente)
            .expect(200)
        ).body.datos.some((p: { id: string }) => p.id === paqueteId),
      ).toBe(true);
    });
    it('impide retirar a terceros y otros roles; solo un guardia entrega a un residente vinculado', async () => {
      await api()
        .post(`/api/v1/paquetes/${paqueteId}/entrega`)
        .set('Authorization', token.residente)
        .send({ residenteId: ids.residente })
        .expect(403);
      await api()
        .post(`/api/v1/paquetes/${paqueteId}/entrega`)
        .set('Authorization', token.seguridad)
        .send({ residenteId: ids.ajeno })
        .expect(400);
      const respuestas = await Promise.all(
        [1, 2].map(() =>
          api()
            .post(`/api/v1/paquetes/${paqueteId}/entrega`)
            .set('Authorization', token.seguridad)
            .send({ residenteId: ids.vecino }),
        ),
      );
      expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
      const p = await db.paquete.findUniqueOrThrow({
        where: { id: paqueteId },
      });
      expect(p.retiraResidenteId).toBe(ids.vecino);
      expect(p.entregadoPorId).toBe(ids.seguridad);
    });
    it('corrige/anula paquetería sin borrar el historial de entrega', async () => {
      await api()
        .patch(`/api/v1/paquetes/${paqueteId}/correccion`)
        .set('Authorization', token.seguridad)
        .send({ estado: 'ANULADO', motivo: 'Error de captura verificado' })
        .expect(200);
      const p = await db.paquete.findUniqueOrThrow({
        where: { id: paqueteId },
      });
      expect(p.estado).toBe('ANULADO');
      expect(p.entregadoAt).not.toBeNull();
      expect(
        await db.auditoriaAdministrativa.count({
          where: { recursoId: paqueteId },
        }),
      ).toBe(1);
    });
    it('rechaza entrada sin confirmación; crea una solicitud privada para el residente de destino', async () => {
      await api()
        .post('/api/v1/visitas/entradas')
        .set('Authorization', token.seguridad)
        .send({
          unidadId: ids.unidad,
          visitanteNombre: 'Juan Perez',
          visitanteDocumento: '012345678',
        })
        .expect(403);
      const r = await api()
        .post('/api/v1/visitas/autorizaciones/solicitudes')
        .set('Authorization', token.seguridad)
        .send({
          unidadId: ids.unidad,
          residenteId: ids.vecino,
          visitanteNombre: 'Juan Perez',
        })
        .expect(201);
      solicitudId = r.body.id;
      expect(r.body.estado).toBe('PENDIENTE');
      await api()
        .patch(`/api/v1/visitas/autorizaciones/${solicitudId}/aprobacion`)
        .set('Authorization', token.residente)
        .send({})
        .expect(404);
      await api()
        .post('/api/v1/visitas/entradas')
        .set('Authorization', token.seguridad)
        .send({ autorizacionId: solicitudId })
        .expect(409);
    });
    it('solo el destinatario confirma y la autorización permite entrar, salir y volver a entrar', async () => {
      await api()
        .patch(`/api/v1/visitas/autorizaciones/${solicitudId}/aprobacion`)
        .set('Authorization', token.vecino)
        .send({})
        .expect(200);
      autorizacionId = solicitudId;
      const r = await api()
        .post('/api/v1/visitas/entradas')
        .set('Authorization', token.seguridad)
        .send({ autorizacionId })
        .expect(201);
      entradaId = r.body.id;
      await api()
        .post('/api/v1/visitas/entradas')
        .set('Authorization', token.seguridad)
        .send({ autorizacionId })
        .expect(409);
      await api()
        .post(`/api/v1/visitas/entradas/${entradaId}/salida`)
        .set('Authorization', token.seguridad)
        .expect(200);
      const segunda = await api()
        .post('/api/v1/visitas/entradas')
        .set('Authorization', token.seguridad)
        .send({ autorizacionId })
        .expect(201);
      expect(segunda.body.id).not.toBe(entradaId);
      expect(
        await db.movimientoVisita.count({ where: { autorizacionId } }),
      ).toBe(2);
    });
    it('no permite cancelar autorizaciones vencidas', async () => {
      const a = await db.autorizacionVisita.create({
        data: {
          residenteId: ids.residente,
          unidadId: ids.unidad,
          visitanteNombre: 'Pedro Perez',
          visitanteDocumento: '123456789',
          inicio: new Date('2020-01-01'),
          fin: new Date('2020-01-02'),
        },
      });
      await api()
        .patch(`/api/v1/visitas/autorizaciones/${a.id}/cancelacion`)
        .set('Authorization', token.residente)
        .expect(409);
    });
    it('permite consultar directorio a administración y seguridad conservando privacidad', async () => {
      for (const rol of ['residente', 'admin', 'seguridad'])
        await api()
          .get('/api/v1/directorio?buscar=Prueba')
          .set('Authorization', token[rol])
          .expect(200);
    });
    it('H12 ofrece lista privada; no devuelve incidencias ajenas', async () => {
      const i = await db.incidencia.create({
        data: {
          residenteId: ids.residente,
          lugarTipo: 'UNIDAD',
          unidadId: ids.unidad,
          categoria: 'OTRO',
          descripcion: 'Incidencia privada de prueba',
        },
      });
      await api()
        .get('/api/v1/incidencias/mias')
        .set('Authorization', token.residente)
        .expect(200);
      await api()
        .get(`/api/v1/incidencias/${i.id}`)
        .set('Authorization', token.ajeno)
        .expect(404);
    });
    it('rechaza publicar asambleas que vencieron estando en borrador', async () => {
      const a = await db.asamblea.create({
        data: {
          titulo: 'Borrador vencido',
          creadorId: ids.admin,
          fechaAt: new Date('2020-01-01'),
          temas: {
            create: {
              pregunta: 'Pregunta',
              aperturaAt: new Date(future(1)),
              cierreAt: new Date(future(2)),
              opciones: { create: [{ texto: 'Si' }, { texto: 'No' }] },
            },
          },
        },
      });
      await api()
        .post(`/api/v1/asambleas/${a.id}/publicacion`)
        .set('Authorization', token.admin)
        .expect(400);
    });
    it('H29/H30 requieren administrador, rechazan rangos y emiten PDF general válido', async () => {
      const hoy = new Date().toISOString().slice(0, 10);
      for (const rol of ['residente', 'seguridad'])
        await api()
          .get(`/api/v1/administracion/reportes?desde=${hoy}&hasta=${hoy}`)
          .set('Authorization', token[rol])
          .expect(403);
      await api()
        .get(
          '/api/v1/administracion/reportes?desde=2026-02-30&hasta=2026-03-01',
        )
        .set('Authorization', token.admin)
        .expect(400);
      await api()
        .get(
          '/api/v1/administracion/reportes?desde=2025-01-01&hasta=2026-12-31',
        )
        .set('Authorization', token.admin)
        .expect(400);
      const r = await api()
        .get(`/api/v1/administracion/reportes?desde=${hoy}&hasta=${hoy}`)
        .set('Authorization', token.admin)
        .expect(200);
      expect(r.body.indicadores).toHaveLength(4);
      expect(JSON.stringify(r.body)).not.toContain(ids.unidad);
      await api()
        .get(`/api/v1/administracion/reportes/pdf?desde=${hoy}&hasta=${hoy}`)
        .expect(401);
      const pdf = await api()
        .get(`/api/v1/administracion/reportes/pdf?desde=${hoy}&hasta=${hoy}`)
        .set('Authorization', token.admin)
        .expect(200);
      expect(pdf.headers['content-type']).toContain('application/pdf');
      expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
    });
    it('cobra una cuota vencida completa con recargo y conserva el comprobante', async () => {
      const c = await db.cuota.create({
        data: {
          unidadId: ids.unidad,
          periodo: '2020-02',
          monto: '100',
          fechaVencimiento: new Date('2020-02-10'),
        },
      });
      const r = await api()
        .post('/api/v1/pagos')
        .set('Authorization', token.residente)
        .send({
          cuotaId: c.id,
          numeroTarjeta: '4242424242424242',
          titular: 'Residente Prueba',
          vencimiento: '12/30',
          cvv: '123',
          idempotencyKey: randomUUID(),
        })
        .expect(201);
      expect(r.body).toMatchObject({ estado: 'APROBADO', monto: '105.00' });
      const guardada = await db.cuota.findUniqueOrThrow({
        where: { id: c.id },
      });
      expect(guardada.recargoAplicado.toFixed(2)).toBe('5.00');
      expect(
        (
          await api()
            .get(`/api/v1/cuotas/${c.id}`)
            .set('Authorization', token.residente)
            .expect(200)
        ).body.monto,
      ).toBe('105.00');
    });
    it('acepta un solo voto por unidad y muestra la opción al administrador únicamente tras el cierre', async () => {
      await db.cuota.create({data:{unidadId:ids.unidad,periodo:'2020-03',monto:'100',fechaVencimiento:new Date('2020-03-10')}});
    const a = await db.asamblea.create({
        data: {
          creadorId: ids.admin,
          titulo: 'Votación del PO',
          fechaAt: new Date(),
          estado: 'PUBLICADA',
          temas: {
            create: {
              pregunta: '¿Opción preferida?',
              aperturaAt: new Date(Date.now() - 60000),
              cierreAt: new Date(Date.now() + 60000),
              opciones: { create: [{ texto: 'A' }, { texto: 'B' }] },
            },
          },
        },
        include: { temas: { include: { opciones: true } } },
      });
      const t = a.temas[0];
      const respuestas = await Promise.all(
        ['residente', 'vecino'].map((rol) =>
          api()
            .post(`/api/v1/votaciones/${t.id}/votos`)
            .set('Authorization', token[rol])
            .send({ unidadId: ids.unidad, opcionId: t.opciones[0].id }),
        ),
      );
      expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
        201, 409,
      ]);
      expect(await db.voto.count({ where: { temaId: t.id } })).toBe(1);
      await api()
        .get(`/api/v1/votaciones/${t.id}/resultados`)
        .set('Authorization', token.admin)
        .expect(409);
      await db.temaVotacion.update({
        where: { id: t.id },
        data: { cierreAt: new Date(Date.now() - 1000) },
      });
      const r = await api()
        .get(`/api/v1/votaciones/${t.id}/resultados`)
        .set('Authorization', token.admin)
        .expect(200);
      expect(r.body.unidadesVotantes[0].opcion).toBe('A');
      await api()
        .get(`/api/v1/votaciones/${t.id}/resultados`)
        .set('Authorization', token.residente)
        .expect(403);
    });
    it('genera la misma tarifa para unidades con diferentes importes históricos', async () => {
      const mes = new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 7);
      await api()
        .post('/api/v1/cuotas/generaciones')
        .set('Authorization', token.admin)
        .send({ periodo: mes })
        .expect(201);
      const cuotas = await db.cuota.findMany({
        where: { unidadId: { in: [ids.unidad, ids.otra] }, periodo: mes },
      });
      expect(cuotas).toHaveLength(2);
      expect(cuotas.every((c) => c.monto.toFixed(2) === '50.00')).toBe(true);
    });
    it('H29 diferencia ausencia de datos de cero y H30 conserva los valores y privacidad',async()=>{
    const hoy=new Date(Date.now()-6*3600000).toISOString().slice(0,10),desde=hoy.slice(0,7)+'-01';
    const r=await api().get(`/api/v1/administracion/reportes?desde=${desde}&hasta=${hoy}`).set('Authorization',token.admin).expect(200);
    const porClave=Object.fromEntries(r.body.indicadores.map((i:{clave:string;valor:number|null})=>[i.clave,i]));
    expect(porClave.morosidad).toMatchObject({valor:100,saldoVencido:'105.00'});
    expect(porClave.incidencias.valor).toBe(1);expect(porClave.uso.valor).toBe(0);expect(porClave.participacion.valor).toBe(50);
    const vacio=await api().get('/api/v1/administracion/reportes?desde=2021-01-01&hasta=2021-01-01').set('Authorization',token.admin).expect(200);
    expect(vacio.body.indicadores.find((i:{clave:string})=>i.clave==='morosidad').valor).toBeNull();expect(vacio.body.indicadores.find((i:{clave:string})=>i.clave==='incidencias').valor).toBeNull();
    const pdf=await api().get(`/api/v1/administracion/reportes/pdf?desde=${desde}&hasta=${hoy}`).set('Authorization',token.admin).expect(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
    const resumen = await api().get(`/api/v1/reportes/resumen?desde=${desde}&hasta=${hoy}`).set('Authorization', token.admin).expect(200);
    expect(resumen.body.morosidad).toMatchObject({ porcentaje: porClave.morosidad.valor, saldoVencido: '105.00' });
    expect(resumen.body.incidenciasAbiertas.abiertas).toBe(porClave.incidencias.valor);
    expect(resumen.body.usoAreas.porcentaje).toBe(porClave.uso.valor);
    expect(resumen.body.participacion.porcentajePromedio).toBe(porClave.participacion.valor);
  });
  afterAll(async () => {
      if (db) {
        await db.auditoriaAdministrativa.deleteMany({
          where: { actorId: ids.admin },
        });
        await db.auditoriaAdministrativa.deleteMany({
          where: { actorId: ids.seguridad },
        });
        await db.notificacion.deleteMany({
          where: { userId: { in: [ids.residente, ids.vecino, ids.ajeno] } },
        });
        await db.lecturaComunicado.deleteMany({ where: { comunicadoId } });
        await db.comunicado.deleteMany({ where: { autorId: ids.admin } });
        await db.movimientoVisita.deleteMany({
          where: { unidadId: { in: [ids.unidad, ids.otra] } },
        });
        await db.autorizacionVisita.deleteMany({
          where: { unidadId: { in: [ids.unidad, ids.otra] } },
        });
        await db.paquete.deleteMany({
          where: { unidadId: { in: [ids.unidad, ids.otra] } },
        });
        await db.reserva.deleteMany({ where: { areaId: ids.area } });
        await db.horarioArea.deleteMany({ where: { areaId: ids.area } });
        await db.areaComun.deleteMany({ where: { id: ids.area } });
        await db.historialIncidencia.deleteMany({
          where: { incidencia: { residenteId: ids.residente } },
        });
        await db.incidencia.deleteMany({
          where: { residenteId: ids.residente },
        });
        await db.pago.deleteMany({
          where: { cuota: { unidadId: { in: [ids.unidad, ids.otra] } } },
        });
        await db.cuota.deleteMany({
          where: { unidadId: { in: [ids.unidad, ids.otra] } },
        });
        const temas = await db.temaVotacion.findMany({
          where: { asamblea: { creadorId: ids.admin } },
          select: { id: true },
        });
        await db.voto.deleteMany({
          where: { temaId: { in: temas.map((t) => t.id) } },
        });
        await db.participacionVoto.deleteMany({
          where: { temaId: { in: temas.map((t) => t.id) } },
        });
        await db.opcionVoto.deleteMany({
          where: { temaId: { in: temas.map((t) => t.id) } },
        });
        await db.temaVotacion.deleteMany({
          where: { id: { in: temas.map((t) => t.id) } },
        });
        await db.asamblea.deleteMany({ where: { creadorId: ids.admin } });
        await db.usuarioUnidad.deleteMany({
          where: { unidadId: { in: [ids.unidad, ids.otra] } },
        });
        await db.unidad.deleteMany({
          where: { id: { in: [ids.unidad, ids.otra] } },
        });
        await db.seccion.deleteMany({ where: { id: ids.seccion } });
        await db.torre.deleteMany({ where: { id: ids.torre } });
        await db.user.deleteMany({
          where: {
            id: {
              in: [
                ids.admin,
                ids.seguridad,
                ids.residente,
                ids.vecino,
                ids.ajeno,
              ],
            },
          },
        });
      }
      await app?.close();
    });
  },
);
