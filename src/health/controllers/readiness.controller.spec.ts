import { describe, it, expect, vi } from 'vitest';
import { ReadinessController } from './readiness.controller.js';
import type { PrismaService } from '@Prisma/services';

describe('Readiness', () => {
  it('solo confirma disponibilidad después de consultar PostgreSQL', async () => {
    const query = vi.fn().mockResolvedValue([{ value: 1 }]);
    const controller = new ReadinessController({
      $queryRaw: query,
    } as unknown as PrismaService);
    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
    expect(query).toHaveBeenCalledOnce();
  });
  it('responde 503 sin revelar la conexión ni el error de PostgreSQL', async () => {
    const controller = new ReadinessController({
      $queryRaw: vi
        .fn()
        .mockRejectedValue(new Error('postgresql://private-credential')),
    } as unknown as PrismaService);
    await expect(controller.ready()).rejects.toMatchObject({
      status: 503,
      message: 'Servicio no disponible',
    });
  });
});
