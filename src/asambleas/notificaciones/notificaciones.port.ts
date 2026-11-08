export const NOTIFICACIONES_PORT = 'NOTIFICACIONES_PORT';

export interface NotificacionVotacionAbierta {
  tipo: 'VOTACION_ABIERTA';
  temaId: string;
  asambleaId: string;
  tituloTema: string;
}

export interface NotificacionesPort {
  crear(
    notificacion: NotificacionVotacionAbierta,
  ): Promise<void>;
}
