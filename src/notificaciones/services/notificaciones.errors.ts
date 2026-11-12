export type NotificacionesErrorCode =
  'NOTIFICACION_DATOS_INVALIDOS' | 'NOTIFICACION_DESTINATARIO_INEXISTENTE';

export class NotificacionesDomainError extends Error {
  constructor(
    readonly code: NotificacionesErrorCode,
    message: string,
    readonly campo?: string,
  ) {
    super(message);
    this.name = 'NotificacionesDomainError';
  }
}

export class NotificacionEntradaInvalidaError extends NotificacionesDomainError {
  constructor(message: string, campo?: string) {
    super('NOTIFICACION_DATOS_INVALIDOS', message, campo);
    this.name = 'NotificacionEntradaInvalidaError';
  }
}

export class NotificacionDestinatarioInexistenteError extends NotificacionesDomainError {
  constructor(
    readonly tipo: 'USUARIO' | 'UNIDAD' | 'TORRE' | 'SECCION',
    readonly id: string,
  ) {
    super(
      'NOTIFICACION_DESTINATARIO_INEXISTENTE',
      `El destinatario ${tipo} no existe.`,
      'destinatario',
    );
    this.name = 'NotificacionDestinatarioInexistenteError';
  }
}
