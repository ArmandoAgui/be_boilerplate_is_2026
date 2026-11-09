import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { MENSAJE_DESCRIPCION_INVALIDA } from '../dto/crear-incidencia.dto.js';
import { incidenciaDomainErrorToHttpException } from '../errors/incidencias.errors.js';

interface HttpErrorBody {
  campo?: unknown;
  error?: unknown;
  message?: unknown;
}

interface MulterErrorLike {
  code?: unknown;
  field?: unknown;
  name?: unknown;
}

const KNOWN_FIELDS = [
  'lugarTipo',
  'unidadId',
  'areaId',
  'categoria',
  'descripcion',
];

@Catch()
export class IncidenciasHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger(IncidenciasHttpFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const normalized =
      incidenciaDomainErrorToHttpException(exception) ?? exception;
    const httpError = this.toMulterHttpError(normalized);

    if (httpError) {
      this.send(
        host,
        httpError.statusCode,
        httpError.error,
        httpError.message,
        httpError.campo,
      );
      return;
    }

    if (normalized instanceof HttpException) {
      const statusCode = normalized.getStatus();
      const body = normalized.getResponse();
      const detail: HttpErrorBody =
        typeof body === 'string' ? { message: body } : (body as HttpErrorBody);
      const messages = Array.isArray(detail.message)
        ? detail.message.filter(
            (message): message is string => typeof message === 'string',
          )
        : [];
      const message =
        messages[0] ??
        (typeof detail.message === 'string'
          ? detail.message
          : normalized.message);
      const campo =
        (typeof detail.campo === 'string' ? detail.campo : undefined) ??
        this.fieldForValidationMessage(message, messages);
      const error =
        typeof detail.error === 'string'
          ? detail.error
          : this.errorNameForStatus(statusCode);

      this.send(host, statusCode, error, message, campo);
      return;
    }

    this.logger.error(
      'Error interno al procesar una incidencia.',
      normalized instanceof Error ? normalized.stack : undefined,
    );
    this.send(
      host,
      500,
      'Internal Server Error',
      'No se pudo completar la operación. Intente de nuevo.',
    );
  }

  private toMulterHttpError(exception: unknown): {
    statusCode: number;
    error: string;
    message: string;
    campo?: string;
  } | null {
    if (!exception || typeof exception !== 'object') return null;

    const error = exception as MulterErrorLike;
    if (error.name !== 'MulterError' && typeof error.code !== 'string') {
      return null;
    }

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Solo se permiten JPG o PNG de hasta 5 MB',
          campo: 'fotos',
        };
      case 'LIMIT_FILE_COUNT':
      case 'LIMIT_UNEXPECTED_FILE':
        return {
          statusCode: 400,
          error: 'Bad Request',
          message:
            error.field === 'fotos'
              ? 'Se permite un máximo de 3 fotos.'
              : 'El único campo de archivo permitido es fotos.',
          campo: 'fotos',
        };
      case 'LIMIT_PART_COUNT':
      case 'LIMIT_FIELD_COUNT':
      case 'LIMIT_FIELD_KEY':
        return {
          statusCode: 400,
          error: 'Bad Request',
          message: 'El formulario de la incidencia no es válido.',
        };
      case 'LIMIT_FIELD_VALUE':
        return error.field === 'descripcion'
          ? {
              statusCode: 400,
              error: 'Bad Request',
              message: MENSAJE_DESCRIPCION_INVALIDA,
              campo: 'descripcion',
            }
          : {
              statusCode: 400,
              error: 'Bad Request',
              message: 'El formulario de la incidencia no es válido.',
              campo:
                typeof error.field === 'string' &&
                KNOWN_FIELDS.includes(error.field)
                  ? error.field
                  : undefined,
            };
      default:
        return error.name === 'MulterError'
          ? {
              statusCode: 400,
              error: 'Bad Request',
              message: 'El archivo enviado no es válido.',
              campo: 'fotos',
            }
          : null;
    }
  }

  private fieldForValidationMessage(
    message: string,
    messages: string[],
  ): string | undefined {
    if (message === MENSAJE_DESCRIPCION_INVALIDA) return 'descripcion';
    if (message.startsWith('Para UNIDAD envíe')) return 'lugarTipo';
    return KNOWN_FIELDS.find((field) =>
      messages.some((item) => item.toLowerCase().includes(field.toLowerCase())),
    );
  }

  private errorNameForStatus(statusCode: number): string {
    if (statusCode === 400) return 'Bad Request';
    if (statusCode === 401) return 'Unauthorized';
    if (statusCode === 403) return 'Forbidden';
    if (statusCode === 404) return 'Not Found';
    if (statusCode === 409) return 'Conflict';
    return statusCode >= 500 ? 'Internal Server Error' : 'Error';
  }

  private send(
    host: ArgumentsHost,
    statusCode: number,
    error: string,
    message: string,
    campo?: string,
  ): void {
    const body: Record<string, string | number> = {
      statusCode,
      error,
      message,
    };
    if (campo) body.campo = campo;

    host.switchToHttp().getResponse<Response>().status(statusCode).json(body);
  }
}
