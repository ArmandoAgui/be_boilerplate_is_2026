import { describe, expect, it, vi } from 'vitest';
import { EstadoIncidencia } from '@PrismaClient';
import type { PrismaService } from '@Prisma/services';
import {
  CantidadEvidenciasIncidenciaInvalidaError,
  TransicionEstadoIncidenciaInvalidaError,
} from '../errors/incidencias.errors.js';
import { IncidenciasRepository } from './incidencias.repository.js';

describe('IncidenciasRepository', () => {
  it('rechaza más de tres evidencias antes de abrir una transacción', async () => {
    const prisma = { $transaction: vi.fn() };
    const repository = new IncidenciasRepository(
      prisma as unknown as PrismaService,
    );
    const data = {
      residenteId: '876e9a00-b854-42bf-9578-06187b22fb8d',
      lugarTipo: 'UNIDAD' as const,
      unidadId: '5f880be5-f20a-4b30-9790-7f73f98d9d26',
      areaId: null,
      categoria: 'FUGA' as const,
      descripcion: 'Hay una fuga de agua',
      evidencias: Array.from({ length: 4 }, (_, index) => ({
        ruta: `archivo-${index}.jpg`,
        mime: 'image/jpeg' as const,
        tamanoBytes: 100,
      })),
    };

    await expect(
      repository.createWithInitialHistory(data),
    ).rejects.toBeInstanceOf(CantidadEvidenciasIncidenciaInvalidaError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('bloquea, condiciona el estado y agrega historial con la misma fecha', async () => {
    const ahora = new Date('2026-11-08T20:00:00.123Z');
    const actual = {
      id: 'd244fc83-9442-4e43-9819-c6b877423c31',
      codigo: 'INC-0001',
      residenteId: 'd12d97d9-5336-482e-a923-bd803b4aeaf2',
      estado: EstadoIncidencia.ASIGNADA,
    };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValueOnce([actual]).mockResolvedValueOnce([
        { ahora },
      ]),
      $executeRaw: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
    };
    const prisma = {
      $transaction: vi.fn(async (operar) => operar(tx)),
    } as unknown as PrismaService;
    const repository = new IncidenciasRepository(prisma);

    const result = await repository.conBloqueoEstado(
      actual.id,
      (sesion) =>
        sesion.aplicarTransicion(
          {
            estadoEsperado: EstadoIncidencia.ASIGNADA,
            estadoDestino: EstadoIncidencia.EN_PROCESO,
          },
          '52fa5ec0-7465-4298-b6d4-940427bd6871',
        ),
    );

    expect(result).toEqual({
      ...actual,
      estado: EstadoIncidencia.EN_PROCESO,
      updatedAt: ahora,
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    const select = tx.$queryRaw.mock.calls[0]?.[0] as TemplateStringsArray;
    const update = tx.$executeRaw.mock.calls[0]?.[0] as TemplateStringsArray;
    const history = tx.$executeRaw.mock.calls[1]?.[0] as TemplateStringsArray;
    expect(Array.from(select).join('')).toContain('FOR UPDATE');
    expect(Array.from(update).join('')).toContain('AND "estado" =');
    expect(Array.from(history).join('')).toContain("'ESTADO'::\"CampoHistorial\"");
    expect(tx.$executeRaw.mock.calls[0]?.[2]).toBe(ahora);
    expect(tx.$executeRaw.mock.calls[1]?.[6]).toBe(ahora);
  });

  it('no inserta historial si la condición de estado no afecta una fila', async () => {
    const tx = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: 'd244fc83-9442-4e43-9819-c6b877423c31',
            codigo: 'INC-0001',
            residenteId: 'd12d97d9-5336-482e-a923-bd803b4aeaf2',
            estado: EstadoIncidencia.ASIGNADA,
          },
        ])
        .mockResolvedValueOnce([{ ahora: new Date() }]),
      $executeRaw: vi.fn().mockResolvedValueOnce(0),
    };
    const prisma = {
      $transaction: vi.fn(async (operar) => operar(tx)),
    } as unknown as PrismaService;
    const repository = new IncidenciasRepository(prisma);

    await expect(
      repository.conBloqueoEstado(
        'd244fc83-9442-4e43-9819-c6b877423c31',
        (sesion) =>
          sesion.aplicarTransicion(
            {
              estadoEsperado: EstadoIncidencia.ASIGNADA,
              estadoDestino: EstadoIncidencia.EN_PROCESO,
            },
            '52fa5ec0-7465-4298-b6d4-940427bd6871',
          ),
      ),
    ).rejects.toBeInstanceOf(TransicionEstadoIncidenciaInvalidaError);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
