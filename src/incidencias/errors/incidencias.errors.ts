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
  | 'EVIDENCIA_NO_ENCONTRADA';

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
  constructor() {
    super('ROL_NO_AUTORIZADO', 'Solo un residente puede reportar incidencias.');
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
