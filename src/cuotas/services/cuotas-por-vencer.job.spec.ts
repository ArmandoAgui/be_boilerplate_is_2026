import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificacionesService } from '../../notificaciones/services/notificaciones.service.js';
import type { CuotasRepository } from '../repositories/cuotas.repository.js';
import { CuotasPorVencerJob } from './cuotas-por-vencer.job.js';

describe('CuotasPorVencerJob', () => {
  let repository: Pick<CuotasRepository, 'cuotasPendientesPorVencer'>;
  let notificaciones: Pick<NotificacionesService, 'crear'>;
  let job: CuotasPorVencerJob;

  beforeEach(() => {
    repository = {
      cuotasPendientesPorVencer: vi.fn().mockResolvedValue([]),
    };
    notificaciones = {
      crear: vi.fn().mockResolvedValue({ creadas: 1 }),
    };
    job = new CuotasPorVencerJob(
      repository as CuotasRepository,
      notificaciones as NotificacionesService,
    );
  });

  it('calcula tres días desde el día local y cruza el cambio de año', async () => {
    await job.ejecutar(new Date('2026-12-31T05:59:00.000Z'));
    await job.ejecutar(new Date('2026-12-31T06:00:00.000Z'));

    expect(repository.cuotasPendientesPorVencer).toHaveBeenNthCalledWith(
      1,
      new Date('2027-01-02T00:00:00.000Z'),
      undefined,
    );
    expect(repository.cuotasPendientesPorVencer).toHaveBeenNthCalledWith(
      2,
      new Date('2027-01-03T00:00:00.000Z'),
      undefined,
    );
  });

  it('recorre lotes ordenados y continúa después de un error por cuota', async () => {
    const primerLote = Array.from({ length: 100 }, (_, indice) => ({
      id: `cuota-${String(indice + 1).padStart(3, '0')}`,
      unidadId: `unidad-${indice + 1}`,
      fechaVencimiento: new Date('2027-01-02T00:00:00.000Z'),
    }));
    const segundoLote = [
      {
        id: 'cuota-101',
        unidadId: 'unidad-101',
        fechaVencimiento: new Date('2027-01-02T00:00:00.000Z'),
      },
    ];
    vi.mocked(repository.cuotasPendientesPorVencer)
      .mockResolvedValueOnce(primerLote)
      .mockResolvedValueOnce(segundoLote);
    vi.mocked(notificaciones.crear).mockImplementation(async (datos) => {
      if (datos.referenciaId === primerLote[0].id) {
        throw new Error('Fallo aislado para esta cuota');
      }
      return { creadas: 1 };
    });

    await job.ejecutar(new Date('2026-12-31T05:59:00.000Z'));

    expect(repository.cuotasPendientesPorVencer).toHaveBeenNthCalledWith(
      2,
      new Date('2027-01-02T00:00:00.000Z'),
      primerLote[primerLote.length - 1].id,
    );
    expect(notificaciones.crear).toHaveBeenCalledTimes(101);
    expect(notificaciones.crear).toHaveBeenLastCalledWith(
      expect.objectContaining({
        destinatario: { tipo: 'UNIDAD', id: 'unidad-101' },
        tipoEvento: 'CUOTA_POR_VENCER',
        moduloOrigen: 'CUOTAS',
        referenciaId: 'cuota-101',
        claveEvento: 'CUOTA_POR_VENCER:cuota-101',
        mensaje: 'Tu cuota vence el 2027-01-02.',
      }),
    );
  });
});
