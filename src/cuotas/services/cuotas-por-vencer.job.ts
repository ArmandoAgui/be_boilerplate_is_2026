import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificacionesService } from '../../notificaciones/services/notificaciones.service.js';
import {
  CUOTAS_POR_VENCER_TAMANO_LOTE,
  CuotasRepository,
} from '../repositories/cuotas.repository.js';
import { hoyLocal } from './cuotas.rules.js';

const ZONA_HORARIA = 'America/El_Salvador';
const DIAS_ANTICIPACION = 3;

/** Envía recordatorios diarios para cuotas pendientes que vencen en tres días. */
@Injectable()
export class CuotasPorVencerJob {
  private readonly logger = new Logger(CuotasPorVencerJob.name);

  constructor(
    private readonly repository: CuotasRepository,
    private readonly notificaciones: NotificacionesService,
  ) {}

  @Cron('0 8 * * *', {
    name: 'cuotas-por-vencer',
    timeZone: ZONA_HORARIA,
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  async ejecutar(ahora = new Date()): Promise<void> {
    const fechaObjetivo = hoyLocal(ahora);
    fechaObjetivo.setUTCDate(fechaObjetivo.getUTCDate() + DIAS_ANTICIPACION);

    let despuesDeId: string | undefined;

    while (true) {
      const lote = await this.repository.cuotasPendientesPorVencer(
        fechaObjetivo,
        despuesDeId,
      );
      if (lote.length === 0) return;

      for (const cuota of lote) {
        const fecha = cuota.fechaVencimiento.toISOString().slice(0, 10);
        try {
          await this.notificaciones.crear({
            destinatario: { tipo: 'UNIDAD', id: cuota.unidadId },
            tipoEvento: 'CUOTA_POR_VENCER',
            moduloOrigen: 'CUOTAS',
            titulo: 'Tu cuota vence pronto',
            mensaje: `Tu cuota vence el ${fecha}.`,
            referenciaId: cuota.id,
            claveEvento: `CUOTA_POR_VENCER:${cuota.id}`,
          });
        } catch (error) {
          this.logger.error(
            `No se pudo enviar CUOTA_POR_VENCER para la cuota ${cuota.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      despuesDeId = lote[lote.length - 1].id;
      if (lote.length < CUOTAS_POR_VENCER_TAMANO_LOTE) return;
    }
  }
}
