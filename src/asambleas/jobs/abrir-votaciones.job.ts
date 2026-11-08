import {
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  Cron,
  CronExpression,
} from '@nestjs/schedule';

import { AsambleasRepository } from '../repositories/asambleas.repository.js';

import {
  NOTIFICACIONES_PORT,
} from '../notificaciones/notificaciones.port.js';

import type {
  NotificacionesPort,
} from '../notificaciones/notificaciones.port.js';

@Injectable()
export class AbrirVotacionesJob {
  private readonly logger = new Logger(
    AbrirVotacionesJob.name,
  );

  constructor(
    private readonly repo: AsambleasRepository,

    @Inject(NOTIFICACIONES_PORT)
    private readonly notificaciones: NotificacionesPort,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
async ejecutar() {
  const temas =
    await this.repo.temasPendientesNotificacion(
      new Date(),
    );

  for (const tema of temas) {
    const reclamada =
      await this.repo.reclamarNotificacion(tema.id);

    // Otra ejecución ya reclamó este tema.
    if (reclamada.count === 0) continue;

    try {
      await this.notificaciones.crear({
        tipo: 'VOTACION_ABIERTA',
        temaId: tema.id,
        asambleaId: tema.asambleaId,
        tituloTema: tema.titulo,
      });
    } catch {
      // Si falla H28, se libera para reintentar.
      await this.repo.liberarNotificacion(tema.id);

      this.logger.warn(
        `No se pudo notificar el tema ${tema.id}. Se reintentará.`,
      );
    }
  }
}
}
