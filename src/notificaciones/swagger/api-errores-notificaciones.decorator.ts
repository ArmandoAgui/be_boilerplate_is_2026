import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { NotificacionesErrorResponseDto } from '../dto/notificaciones-error-response.dto.js';

/** Errores de validación y acceso para el listado GET. */
export function ApiErroresConsultaNotificaciones() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Filtros inválidos, repetidos o parámetros desconocidos.',
      type: NotificacionesErrorResponseDto,
    }),
    ...decoradoresAcceso(),
  );
}

/** Errores de acceso comunes para ambas rutas H27. */
export function ApiErroresAccesoNotificaciones() {
  return applyDecorators(...decoradoresAcceso());
}

function decoradoresAcceso() {
  return [
    ApiUnauthorizedResponse({
      description: 'Bearer ausente, inválido o expirado; cuenta inexistente o inactiva.',
      type: NotificacionesErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Solo un Residente activo puede usar la bandeja.',
      type: NotificacionesErrorResponseDto,
    }),
  ];
}

/** 404 indistinguible para el aviso inexistente o perteneciente a otra persona. */
export function ApiAvisoNoEncontrado() {
  return ApiNotFoundResponse({
    description: 'Aviso inexistente o ajeno al usuario autenticado.',
    type: NotificacionesErrorResponseDto,
  });
}
