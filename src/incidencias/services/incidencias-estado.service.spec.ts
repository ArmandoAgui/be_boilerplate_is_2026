import { EstadoIncidencia, Rol } from '@PrismaClient';
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NotificacionesH28FallidasError,
  NotificacionesH28NoDisponiblesError,
  TransicionEstadoIncidenciaInvalidaError,
} from '../errors/incidencias.errors.js';
import type { H28NotificacionesPort } from '../notificaciones/h28-notificaciones.port.js';
import type { IncidenciasRepository } from '../repositories/incidencias.repository.js';
import type { EvidenciasStorage } from '../storage/evidencias.storage.js';
import type { IncidenciaLugarService } from './incidencia-lugar.service.js';
import { IncidenciasService } from './incidencias.service.js';

const ids = {
  admin: '52fa5ec0-7465-4298-b6d4-940427bd6871',
  incidencia: 'd244fc83-9442-4e43-9819-c6b877423c31',
  residente: 'd12d97d9-5336-482e-a923-bd803b4aeaf2',
};

const fecha = new Date('2026-11-08T20:00:00.123Z');

function crearHarness(
  estado: EstadoIncidencia,
  notificacionesH28?: H28NotificacionesPort,
) {
  const aplicarTransicion = vi.fn(async (transicion) => ({
    id: ids.incidencia,
    codigo: 'INC-0001',
    residenteId: ids.residente,
    estado: transicion.estadoDestino,
    updatedAt: fecha,
  }));
  const sesion = {
    actual: {
      id: ids.incidencia,
      codigo: 'INC-0001',
      residenteId: ids.residente,
      estado,
    },
    aplicarTransicion,
  };
  let transaccionConfirmada = false;
  const repository = {
    findUserAccess: vi.fn().mockResolvedValue({
      isActive: true,
      rol: Rol.ADMINISTRADOR,
    }),
    conBloqueoEstado: vi.fn(async (_id, operar) => {
      const result = await operar(sesion as never);
      transaccionConfirmada = true;
      return result;
    }),
  };
  const notificaciones = notificacionesH28;
  const service = new IncidenciasService(
    repository as unknown as IncidenciasRepository,
    {} as IncidenciaLugarService,
    {} as EvidenciasStorage,
    notificaciones,
  );

  return {
    service,
    repository,
    sesion,
    transaccionConfirmada: () => transaccionConfirmada,
  };
}

describe('IncidenciasService H11', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inicia atención con el actor de sesión y sin llamar a H28', async () => {
    const h = crearHarness(EstadoIncidencia.ASIGNADA);

    await expect(
      h.service.actualizarEstado(ids.admin, ids.incidencia, {
        estado: EstadoIncidencia.EN_PROCESO,
      }),
    ).resolves.toEqual({
      id: ids.incidencia,
      estado: EstadoIncidencia.EN_PROCESO,
      actualizadaAt: fecha.toISOString(),
    });

    expect(h.sesion.aplicarTransicion).toHaveBeenCalledWith(
      {
        estadoEsperado: EstadoIncidencia.ASIGNADA,
        estadoDestino: EstadoIncidencia.EN_PROCESO,
      },
      ids.admin,
    );
  });

  it('rechaza una pareja inválida sin aplicar la transición', async () => {
    const h = crearHarness(EstadoIncidencia.ABIERTA);

    await expect(
      h.service.actualizarEstado(ids.admin, ids.incidencia, {
        estado: EstadoIncidencia.EN_PROCESO,
      }),
    ).rejects.toBeInstanceOf(TransicionEstadoIncidenciaInvalidaError);

    expect(h.sesion.aplicarTransicion).not.toHaveBeenCalled();
  });

  it('no confirma RESUELTA si falta el provider H28', async () => {
    const h = crearHarness(EstadoIncidencia.EN_PROCESO);

    await expect(
      h.service.actualizarEstado(ids.admin, ids.incidencia, {
        estado: EstadoIncidencia.RESUELTA,
      }),
    ).rejects.toBeInstanceOf(NotificacionesH28NoDisponiblesError);

    expect(h.sesion.aplicarTransicion).not.toHaveBeenCalled();
  });

  it('solicita el aviso solo después del commit de la resolución', async () => {
    let h: ReturnType<typeof crearHarness>;
    const crearAviso = vi.fn(async () => {
      expect(h.transaccionConfirmada()).toBe(true);
      return { creadas: 0 };
    });
    const notificaciones: H28NotificacionesPort = {
      crear: crearAviso,
    };
    h = crearHarness(EstadoIncidencia.EN_PROCESO, notificaciones);

    await expect(
      h.service.actualizarEstado(ids.admin, ids.incidencia, {
        estado: EstadoIncidencia.RESUELTA,
      }),
    ).resolves.toMatchObject({
      estado: EstadoIncidencia.RESUELTA,
      actualizadaAt: fecha.toISOString(),
    });

    expect(crearAviso).toHaveBeenCalledWith({
      destinatario: { tipo: 'USUARIO', id: ids.residente },
      tipoEvento: 'INCIDENCIA_RESUELTA',
      titulo: 'Tu incidencia fue resuelta',
      mensaje: 'Tu incidencia INC-0001 fue resuelta.',
      moduloOrigen: 'INCIDENCIAS',
      referenciaId: ids.incidencia,
      claveEvento: `INCIDENCIA_RESUELTA:${ids.incidencia}`,
    });
  });

  it('no llama a H28 cuando falla la transacción de estado e historial', async () => {
    const crearAviso = vi.fn(async () => ({ creadas: 1 }));
    const h = crearHarness(EstadoIncidencia.EN_PROCESO, {
      crear: crearAviso,
    });
    const falloTransaccional = new Error('fallo de persistencia');
    vi.spyOn(h.repository, 'conBloqueoEstado').mockRejectedValue(
      falloTransaccional,
    );

    await expect(
      h.service.actualizarEstado(ids.admin, ids.incidencia, {
        estado: EstadoIncidencia.RESUELTA,
      }),
    ).rejects.toBe(falloTransaccional);

    expect(crearAviso).not.toHaveBeenCalled();
  });

  it('registra el fallo de H28 posterior al commit y normaliza el error', async () => {
    let h: ReturnType<typeof crearHarness>;
    const fallo = new Error('Fallo temporal de H28');
    const crearAviso = vi.fn(async () => {
      expect(h.transaccionConfirmada()).toBe(true);
      throw fallo;
    });
    const notificaciones: H28NotificacionesPort = { crear: crearAviso };
    h = crearHarness(EstadoIncidencia.EN_PROCESO, notificaciones);
    const registro = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    try {
      await expect(
        h.service.actualizarEstado(ids.admin, ids.incidencia, {
          estado: EstadoIncidencia.RESUELTA,
        }),
      ).rejects.toBeInstanceOf(NotificacionesH28FallidasError);

      expect(h.transaccionConfirmada()).toBe(true);
      expect(h.sesion.aplicarTransicion).toHaveBeenCalledOnce();
      expect(crearAviso).toHaveBeenCalledOnce();
      expect(registro).toHaveBeenCalledWith(
        JSON.stringify({
          evento: 'H11_H28_AVISO_FALLIDO_TRAS_COMMIT',
          incidenciaId: ids.incidencia,
          claveEvento: `INCIDENCIA_RESUELTA:${ids.incidencia}`,
          residenteId: ids.residente,
          estadoConfirmado: EstadoIncidencia.RESUELTA,
          fechaConfirmacion: fecha.toISOString(),
        }),
        fallo.stack,
      );
    } finally {
      registro.mockRestore();
    }
  });
});
