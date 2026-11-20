import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacionesService } from '../notificaciones/services/notificaciones.service.js';
import {
  AsambleasRepository,
  TEMAS_APERTURA_TAMANO_LOTE,
} from './asambleas.repository.js';

/** Procesa temas abiertos cada minuto y deja reintentar los fallidos. */
@Injectable()
export class AbrirVotacionesJob {
  private readonly logger = new Logger(AbrirVotacionesJob.name);

  constructor(
    private readonly repository: AsambleasRepository,
    private readonly notificaciones: NotificacionesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'abrir-votaciones',
    waitForCompletion: true,
    disabled: process.env.NODE_ENV === 'test',
  })
  async ejecutar(ahora = new Date()): Promise<void> {
    let despuesDeId: string | undefined;

    while (true) {
      const temas = await this.repository.temasPendientesDeApertura(
        ahora,
        despuesDeId,
      );
      if (temas.length === 0) return;

      for (const tema of temas) {
        try {
          await this.notificaciones.crearAvisoVotacionAbierta(tema.id, ahora);
        } catch (error) {
          this.logger.error(
            `No se pudo enviar VOTACION_ABIERTA para el tema ${tema.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      despuesDeId = temas[temas.length - 1].id;
      if (temas.length < TEMAS_APERTURA_TAMANO_LOTE) return;
    }
  }
}
