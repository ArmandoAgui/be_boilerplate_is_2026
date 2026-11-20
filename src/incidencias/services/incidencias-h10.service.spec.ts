import { BadRequestException } from '@nestjs/common';
import { EstadoIncidencia, Prioridad, Rol } from '@PrismaClient';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdministradorIncidenciasRequeridoError,
  IncidenciaResueltaError,
  ResponsableIncidenciaNoValidoError,
  SolicitudAsignacionVaciaError,
  UsuarioIncidenciaNoDisponibleError,
} from '../errors/incidencias.errors.js';
import type { IncidenciasRepository } from '../repositories/incidencias.repository.js';
import type { EvidenciasStorage } from '../storage/evidencias.storage.js';
import type { IncidenciaLugarService } from './incidencia-lugar.service.js';
import { IncidenciasService } from './incidencias.service.js';

const ids = {
  admin: '52fa5ec0-7465-4298-b6d4-940427bd6871',
  incidencia: 'd244fc83-9442-4e43-9819-c6b877423c31',
  seguridad: 'e8cd3675-ff02-4974-a98c-d942bddcf041',
};
const actual = {
  id: ids.incidencia,
  prioridad: null,
  responsableId: null,
  responsableNombre: null,
  estado: EstadoIncidencia.ABIERTA,
};
const actualizado = {
  id: ids.incidencia,
  prioridad: Prioridad.ALTA,
  responsable: null,
  estado: EstadoIncidencia.ABIERTA,
};

function crearServicio() {
  const repository = {
    findUserAccess: vi.fn(),
    listarAdministrativamente: vi.fn(),
    listarResponsablesAdministrativamente: vi.fn(),
    conBloqueoAsignacion: vi.fn(),
  };
  const service = new IncidenciasService(
    repository as unknown as IncidenciasRepository,
    {} as IncidenciaLugarService,
    {} as EvidenciasStorage,
  );
  return { service, repository };
}

describe('IncidenciasService H10', () => {
  let h: ReturnType<typeof crearServicio>;

  beforeEach(() => {
    h = crearServicio();
  });

  it('solo verifica como administrador a una cuenta activa', async () => {
    h.repository.findUserAccess.mockResolvedValueOnce({
      isActive: true,
      rol: Rol.ADMINISTRADOR,
    });
    await expect(
      h.service.verificarAdministradorActivo(ids.admin),
    ).resolves.toBeUndefined();

    h.repository.findUserAccess.mockResolvedValueOnce({
      isActive: false,
      rol: Rol.ADMINISTRADOR,
    });
    await expect(
      h.service.verificarAdministradorActivo(ids.admin),
    ).rejects.toBeInstanceOf(UsuarioIncidenciaNoDisponibleError);

    h.repository.findUserAccess.mockResolvedValueOnce({
      isActive: true,
      rol: Rol.SEGURIDAD,
    });
    await expect(
      h.service.verificarAdministradorActivo(ids.admin),
    ).rejects.toBeInstanceOf(AdministradorIncidenciasRequeridoError);
  });

  it('serializa fecha del listado y calcula el offset en servidor', async () => {
    const creadaAt = new Date('2026-11-08T12:34:56.000Z');
    h.repository.findUserAccess.mockResolvedValueOnce({
      isActive: true,
      rol: Rol.ADMINISTRADOR,
    });
    h.repository.listarAdministrativamente.mockResolvedValueOnce({
      datos: [
        {
          id: ids.incidencia,
          codigo: 'INC-10001',
          lugar: 'T-1-01',
          categoria: 'FUGA',
          creadaAt,
          prioridad: null,
          responsable: null,
          estado: EstadoIncidencia.ABIERTA,
        },
      ],
      total: 21,
    });

    const result = await h.service.listarAdministrativamente(ids.admin, {
      estado: EstadoIncidencia.ABIERTA,
      pagina: 2,
      tamanoPagina: 10,
    });

    expect(result.datos[0]?.creadaAt).toBe(creadaAt.toISOString());
    expect(result).toMatchObject({ total: 21, pagina: 2, tamanoPagina: 10 });
    expect(h.repository.listarAdministrativamente).toHaveBeenCalledWith(
      { estado: EstadoIncidencia.ABIERTA, pagina: 2, tamanoPagina: 10 },
      10,
    );
  });

  it('rechaza identidad o paginación insegura antes de la consulta', async () => {
    await expect(
      h.service.listarAdministrativamente('no-uuid', {
        pagina: 1,
        tamanoPagina: 20,
      }),
    ).rejects.toBeInstanceOf(UsuarioIncidenciaNoDisponibleError);
    expect(h.repository.listarAdministrativamente).not.toHaveBeenCalled();

    h.repository.findUserAccess.mockResolvedValueOnce({
      isActive: true,
      rol: Rol.ADMINISTRADOR,
    });
    await expect(
      h.service.listarAdministrativamente(ids.admin, {
        pagina: Number.MAX_SAFE_INTEGER,
        tamanoPagina: 50,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.repository.listarAdministrativamente).not.toHaveBeenCalled();
  });

  it('revalida candidato y calcula cambios dentro de la unidad bloqueada', async () => {
    h.repository.findUserAccess.mockResolvedValueOnce({
      isActive: true,
      rol: Rol.ADMINISTRADOR,
    });
    const sesion = {
      actual,
      buscarCandidato: vi.fn().mockResolvedValue({
        id: ids.seguridad,
        isActive: true,
        rol: Rol.SEGURIDAD,
      }),
      aplicarPlan: vi.fn().mockResolvedValue(actualizado),
    };
    h.repository.conBloqueoAsignacion.mockImplementationOnce(
      async (_id, operar) => operar(sesion as never),
    );

    await expect(
      h.service.actualizarAsignacion(ids.admin, ids.incidencia, {
        prioridad: Prioridad.ALTA,
        responsableId: ids.seguridad,
      }),
    ).resolves.toEqual(actualizado);

    expect(h.repository.conBloqueoAsignacion).toHaveBeenCalledWith(
      ids.incidencia,
      expect.any(Function),
    );
    expect(sesion.buscarCandidato).toHaveBeenCalledWith(ids.seguridad);
    expect(sesion.aplicarPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        prioridad: Prioridad.ALTA,
        responsableId: ids.seguridad,
        estado: EstadoIncidencia.ASIGNADA,
        historial: expect.any(Array),
      }),
    );
  });

  it('rechaza RESUELTA antes de consultar al candidato o escribir', async () => {
    h.repository.findUserAccess.mockResolvedValueOnce({
      isActive: true,
      rol: Rol.ADMINISTRADOR,
    });
    const sesion = {
      actual: { ...actual, estado: EstadoIncidencia.RESUELTA },
      buscarCandidato: vi.fn(),
      aplicarPlan: vi.fn(),
    };
    h.repository.conBloqueoAsignacion.mockImplementationOnce(
      async (_id, operar) => operar(sesion as never),
    );

    await expect(
      h.service.actualizarAsignacion(ids.admin, ids.incidencia, {
        responsableId: ids.seguridad,
      }),
    ).rejects.toBeInstanceOf(IncidenciaResueltaError);
    expect(sesion.buscarCandidato).not.toHaveBeenCalled();
    expect(sesion.aplicarPlan).not.toHaveBeenCalled();
  });

  it('frena UUID malformado, body vacío y candidato no elegible', async () => {
    h.repository.findUserAccess.mockResolvedValue({
      isActive: true,
      rol: Rol.ADMINISTRADOR,
    });

    await expect(
      h.service.actualizarAsignacion(ids.admin, 'id-invalido', {
        prioridad: Prioridad.ALTA,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      h.service.actualizarAsignacion(ids.admin, ids.incidencia, {}),
    ).rejects.toBeInstanceOf(SolicitudAsignacionVaciaError);
    expect(h.repository.conBloqueoAsignacion).not.toHaveBeenCalled();

    const sesion = {
      actual,
      buscarCandidato: vi.fn().mockResolvedValue(null),
      aplicarPlan: vi.fn(),
    };
    h.repository.conBloqueoAsignacion.mockImplementationOnce(
      async (_id, operar) => operar(sesion as never),
    );
    await expect(
      h.service.actualizarAsignacion(ids.admin, ids.incidencia, {
        responsableId: ids.seguridad,
      }),
    ).rejects.toBeInstanceOf(ResponsableIncidenciaNoValidoError);
    expect(sesion.aplicarPlan).not.toHaveBeenCalled();
  });
});
