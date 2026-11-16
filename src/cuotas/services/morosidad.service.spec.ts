import { describe, expect, it, vi } from 'vitest';
import { MorosidadService } from './morosidad.service.js';
import type { CuotasRepository } from '../repositories/cuotas.repository.js';

describe('Morosidad filtrada para H29', () => {
  it('usa el mismo período para contar cuotas y calcular saldos, incluidos recargos', async () => {
    const repo = {
      morosidadPorUnidad: vi
        .fn()
        .mockResolvedValue([
          {
            unidadId: 'u1',
            _count: { _all: 1 },
            _min: { fechaVencimiento: new Date('2026-10-10') },
          },
        ]),
      unidadesConTorre: vi
        .fn()
        .mockResolvedValue([
          { id: 'u1', codigo: 'A1', torre: { nombre: 'A' } },
        ]),
      vencidas: vi.fn().mockResolvedValue([]),
    };
    const periodo = {
      desde: new Date('2026-10-01'),
      hasta: new Date('2026-10-31'),
    };
    await new MorosidadService(repo as unknown as CuotasRepository).calcular(
      new Date('2026-11-16'),
      undefined,
      periodo,
    );
    const conteo = repo.morosidadPorUnidad.mock.calls[0][0];
    expect(repo.vencidas).toHaveBeenCalledWith(conteo);
    expect(conteo.AND).toContainEqual({
      fechaVencimiento: { gte: periodo.desde, lte: periodo.hasta },
    });
  });
});
