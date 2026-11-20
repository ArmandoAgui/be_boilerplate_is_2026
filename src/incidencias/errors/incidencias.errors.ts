import { HttpException } from '@nestjs/common';

export type IncidenciaDomainErrorCode =
  | 'LUGAR_INVALIDO'
  | 'UNIDAD_INEXISTENTE'
  | 'UNIDAD_AJENA'
  | 'AREA_INEXISTENTE'
  | 'AREA_INACTIVA'
  | 'FOTOS_INVALIDAS'
  | 'USUARIO_NO_DISPONIBLE'
  | 'ROL_NO_AUTORIZADO'
  | 'EVIDENCIA_NO_ENCONTRADA'
  | 'ADMINISTRADOR_REQUERIDO'
  | 'RESPONSABLE_NO_VALIDO'
  | 'INCIDENCIA_NO_ENCONTRADA'
  | 'INCIDENCIA_DETALLE_NO_ENCONTRADA'
  | 'INCIDENCIA_RESUELTA'
  | 'ASIGNACION_VACIA'
  | 'PRIORIDAD_NO_VALIDA'
  | 'ESTADO_DESTINO_NO_VALIDO'
  | 'TRANSICION_ESTADO_INVALIDA'
  | 'NOTIFICACIONES_NO_DISPONIBLES'
  | 'NOTIFICACIONES_H28_FALLIDAS';

export class IncidenciaDomainError extends Error {
  constructor(
    readonly code: IncidenciaDomainErrorCode,
    message: string,
    readonly campo?: string,
  ) {
    super(message);
    this.name = 'IncidenciaDomainError';
  }
}

export class LugarIncidenciaInvalidoError extends IncidenciaDomainError {
  constructor() {
    super(
      'LUGAR_INVALIDO',
      'Para UNIDAD envíe solo unidadId; para AREA_COMUN envíe solo areaId.',
      'lugarTipo',
    );
  }
}

export class UnidadIncidenciaInexistenteError extends IncidenciaDomainError {
  constructor() {
    super('UNIDAD_INEXISTENTE', 'La unidad indicada no existe.', 'unidadId');
  }
}

export class UnidadIncidenciaAjenaError extends IncidenciaDomainError {
  constructor() {
    super(
      'UNIDAD_AJENA',
      'La unidad indicada no pertenece al residente autenticado.',
      'unidadId',
    );
  }
}

export class AreaIncidenciaInexistenteError extends IncidenciaDomainError {
  constructor() {
    super('AREA_INEXISTENTE', 'El área indicada no existe.', 'areaId');
  }
}

export class AreaIncidenciaInactivaError extends IncidenciaDomainError {
  constructor() {
    super('AREA_INACTIVA', 'El área indicada no está activa.', 'areaId');
  }
}

export class CantidadEvidenciasIncidenciaInvalidaError extends IncidenciaDomainError {
  constructor() {
    super('FOTOS_INVALIDAS', 'Se permite un máximo de 3 fotos.', 'fotos');
  }
}

export class UsuarioIncidenciaNoDisponibleError extends IncidenciaDomainError {
  constructor() {
    super('USUARIO_NO_DISPONIBLE', 'La cuenta no existe o está inactiva.');
  }
}

export class RolIncidenciaNoAutorizadoError extends IncidenciaDomainError {
  constructor(message = 'Solo un residente puede reportar incidencias.') {
    super('ROL_NO_AUTORIZADO', message);
  }
}

export class IncidenciaEvidenciaNoEncontradaError extends IncidenciaDomainError {
  constructor() {
    super(
      'EVIDENCIA_NO_ENCONTRADA',
      'La evidencia solicitada no está disponible.',
    );
  }
}

export class AdministradorIncidenciasRequeridoError extends IncidenciaDomainError {
  constructor() {
    super(
      'ADMINISTRADOR_REQUERIDO',
      'Solo un administrador puede gestionar incidencias.',
    );
  }
}

export class ResponsableIncidenciaNoValidoError extends IncidenciaDomainError {
  constructor() {
    super(
      'RESPONSABLE_NO_VALIDO',
      'Elija un responsable válido',
      'responsableId',
    );
  }
}

export class IncidenciaNoEncontradaError extends IncidenciaDomainError {
  constructor(message = 'La incidencia solicitada no existe.') {
    super('INCIDENCIA_NO_ENCONTRADA', message);
  }
}

export class EstadoIncidenciaDestinoInvalidoError extends IncidenciaDomainError {
  constructor() {
    super(
      'ESTADO_DESTINO_NO_VALIDO',
      'El estado debe ser EN_PROCESO o RESUELTA.',
      'estado',
    );
  }
}

export class TransicionEstadoIncidenciaInvalidaError extends IncidenciaDomainError {
  constructor(message: string) {
    super('TRANSICION_ESTADO_INVALIDA', message, 'estado');
  }
}

export class NotificacionesH28NoDisponiblesError extends IncidenciaDomainError {
  constructor() {
    super(
      'NOTIFICACIONES_NO_DISPONIBLES',
      'No se pudo completar la operación. Intente de nuevo.',
    );
  }
}

/** Oculta errores internos de H28 y conserva la respuesta común 500 de H11. */
export class NotificacionesH28FallidasError extends IncidenciaDomainError {
  constructor() {
    super(
      'NOTIFICACIONES_H28_FALLIDAS',
      'No se pudo completar la operación. Intente de nuevo.',
    );
  }
}

export class IncidenciaDetalleNoEncontradaError extends IncidenciaDomainError {
  constructor() {
    super('INCIDENCIA_DETALLE_NO_ENCONTRADA', 'Incidencia no encontrada.');
  }
}

export class IncidenciaResueltaError extends IncidenciaDomainError {
  constructor() {
    super(
      'INCIDENCIA_RESUELTA',
      'No se puede modificar la asignación de una incidencia resuelta',
    );
  }
}

export class SolicitudAsignacionVaciaError extends IncidenciaDomainError {
  constructor() {
    super(
      'ASIGNACION_VACIA',
      'Debe indicar al menos una prioridad o un responsable',
    );
  }
}

export class PrioridadIncidenciaNoValidaError extends IncidenciaDomainError {
  constructor() {
    super(
      'PRIORIDAD_NO_VALIDA',
      'prioridad debe ser BAJA, MEDIA, ALTA o URGENTE y no admite null.',
      'prioridad',
    );
  }
}

const HTTP_ERROR_BY_CODE: Record<
  IncidenciaDomainErrorCode,
  { status: number; error: string }
> = {
  LUGAR_INVALIDO: { status: 400, error: 'Bad Request' },
  UNIDAD_INEXISTENTE: { status: 404, error: 'Not Found' },
  UNIDAD_AJENA: { status: 403, error: 'Forbidden' },
  AREA_INEXISTENTE: { status: 404, error: 'Not Found' },
  AREA_INACTIVA: { status: 400, error: 'Bad Request' },
  FOTOS_INVALIDAS: { status: 400, error: 'Bad Request' },
  USUARIO_NO_DISPONIBLE: { status: 401, error: 'Unauthorized' },
  ROL_NO_AUTORIZADO: { status: 403, error: 'Forbidden' },
  EVIDENCIA_NO_ENCONTRADA: { status: 404, error: 'Not Found' },
  ADMINISTRADOR_REQUERIDO: { status: 403, error: 'Forbidden' },
  RESPONSABLE_NO_VALIDO: { status: 400, error: 'Bad Request' },
  INCIDENCIA_NO_ENCONTRADA: { status: 404, error: 'Not Found' },
  INCIDENCIA_DETALLE_NO_ENCONTRADA: { status: 404, error: 'Not Found' },
  INCIDENCIA_RESUELTA: { status: 409, error: 'Conflict' },
  ASIGNACION_VACIA: { status: 400, error: 'Bad Request' },
  PRIORIDAD_NO_VALIDA: { status: 400, error: 'Bad Request' },
  ESTADO_DESTINO_NO_VALIDO: { status: 400, error: 'Bad Request' },
  TRANSICION_ESTADO_INVALIDA: { status: 409, error: 'Conflict' },
  NOTIFICACIONES_NO_DISPONIBLES: {
    status: 500,
    error: 'Internal Server Error',
  },
  NOTIFICACIONES_H28_FALLIDAS: {
    status: 500,
    error: 'Internal Server Error',
  },
};

/** Traduce solo errores de dominio conocidos; los demás siguen su manejo normal. */
export function incidenciaDomainErrorToHttpException(
  error: unknown,
): HttpException | null {
  if (!(error instanceof IncidenciaDomainError)) return null;

  const mapping = HTTP_ERROR_BY_CODE[error.code];
  return new HttpException(
    {
      statusCode: mapping.status,
      error: mapping.error,
      message: error.message,
      ...(error.campo ? { campo: error.campo } : {}),
    },
    mapping.status,
  );
}
