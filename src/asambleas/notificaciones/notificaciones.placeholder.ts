import type {
  NotificacionesPort,
  NotificacionVotacionAbierta,
} from './notificaciones.port.js';

export class NotificacionesPlaceholder
  implements NotificacionesPort
{
  async crear(
    _notificacion: NotificacionVotacionAbierta,
  ): Promise<void> {
    throw new Error(
      'La integración con H28 todavía no está disponible.',
    );
  }
}
