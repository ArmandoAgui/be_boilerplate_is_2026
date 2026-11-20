import { describe, expect, it, vi } from 'vitest';
import { CrearIncidenciaDto } from '../dto/crear-incidencia.dto.js';
import {
  AreaIncidenciaInactivaError,
  AreaIncidenciaInexistenteError,
  LugarIncidenciaInvalidoError,
  UnidadIncidenciaAjenaError,
  UnidadIncidenciaInexistenteError,
} from '../errors/incidencias.errors.js';
import type { IncidenciasRepository } from '../repositories/incidencias.repository.js';
import { IncidenciaLugarService } from './incidencia-lugar.service.js';

const residenteId = '876e9a00-b854-42bf-9578-06187b22fb8d';
const unidadId = '5f880be5-f20a-4b30-9790-7f73f98d9d26';
const areaId = '0ee9eb6d-e68b-4311-9a04-5944bb08b3ed';
const dto = (value: Partial<CrearIncidenciaDto>) => value as CrearIncidenciaDto;

describe('IncidenciaLugarService', () => {
  const repository = {
    findUnitAccess: vi.fn(),
    findAreaAccess: vi.fn(),
  };
  const service = new IncidenciaLugarService(
    repository as unknown as IncidenciasRepository,
  );

  it('permite reportar en una unidad vinculada al residente', async () => {
    repository.findUnitAccess.mockResolvedValueOnce({
      existe: true,
      vinculada: true,
    });
    await expect(
      service.validar(residenteId, dto({ lugarTipo: 'UNIDAD', unidadId })),
    ).resolves.toBeUndefined();
    expect(repository.findUnitAccess).toHaveBeenCalledWith(
      unidadId,
      residenteId,
    );
  });

  it('distingue una unidad inexistente de una unidad ajena', async () => {
    repository.findUnitAccess.mockResolvedValueOnce({
      existe: false,
      vinculada: false,
    });
    await expect(
      service.validar(residenteId, dto({ lugarTipo: 'UNIDAD', unidadId })),
    ).rejects.toBeInstanceOf(UnidadIncidenciaInexistenteError);

    repository.findUnitAccess.mockResolvedValueOnce({
      existe: true,
      vinculada: false,
    });
    await expect(
      service.validar(residenteId, dto({ lugarTipo: 'UNIDAD', unidadId })),
    ).rejects.toBeInstanceOf(UnidadIncidenciaAjenaError);
  });

  it('solo acepta áreas comunes existentes y activas', async () => {
    repository.findAreaAccess.mockResolvedValueOnce({ activa: true });
    await expect(
      service.validar(residenteId, dto({ lugarTipo: 'AREA_COMUN', areaId })),
    ).resolves.toBeUndefined();

    repository.findAreaAccess.mockResolvedValueOnce(null);
    await expect(
      service.validar(residenteId, dto({ lugarTipo: 'AREA_COMUN', areaId })),
    ).rejects.toBeInstanceOf(AreaIncidenciaInexistenteError);

    repository.findAreaAccess.mockResolvedValueOnce({ activa: false });
    await expect(
      service.validar(residenteId, dto({ lugarTipo: 'AREA_COMUN', areaId })),
    ).rejects.toBeInstanceOf(AreaIncidenciaInactivaError);
  });

  it.each([
    ['UUID malformado', { lugarTipo: 'UNIDAD', unidadId: 'no-uuid' }],
    ['ambos destinos', { lugarTipo: 'UNIDAD', unidadId, areaId }],
    ['destino ausente', { lugarTipo: 'AREA_COMUN' }],
    ['destino de otro tipo', { lugarTipo: 'UNIDAD', areaId }],
    ['tipo desconocido', { lugarTipo: 'OTRO', unidadId }],
  ])(
    'rechaza el lugar inválido: %s antes de consultar la base',
    async (_caso, input) => {
      repository.findUnitAccess.mockClear();
      repository.findAreaAccess.mockClear();
      await expect(
        service.validar(residenteId, dto(input as Partial<CrearIncidenciaDto>)),
      ).rejects.toBeInstanceOf(LugarIncidenciaInvalidoError);
      expect(repository.findUnitAccess).not.toHaveBeenCalled();
      expect(repository.findAreaAccess).not.toHaveBeenCalled();
    },
  );
});
