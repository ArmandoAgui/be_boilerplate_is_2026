import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@Prisma/services';
import { CantidadEvidenciasIncidenciaInvalidaError } from '../errors/incidencias.errors.js';
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
});
