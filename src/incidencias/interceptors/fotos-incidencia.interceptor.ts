import {
  BadRequestException,
  HttpException,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { MENSAJE_DESCRIPCION_INVALIDA } from '../dto/crear-incidencia.dto.js';
import {
  CANTIDAD_MAXIMA_FOTOS_INCIDENCIA,
  MENSAJE_FOTOS_INCIDENCIA_INVALIDAS,
  TAMANO_MAXIMO_FOTO_INCIDENCIA,
} from '../validators/fotos-incidencia.validator.js';

const MAXIMO_TAMANO_CAMPO = 16_384;
const MAXIMO_CAMPOS = 5;
const MAXIMO_PARTES = MAXIMO_CAMPOS + CANTIDAD_MAXIMA_FOTOS_INCIDENCIA;

const MultipartFotosBase = FilesInterceptor(
  'fotos',
  CANTIDAD_MAXIMA_FOTOS_INCIDENCIA,
  {
    storage: multer.memoryStorage(),
    limits: {
      fieldNameSize: 100,
      fieldSize: MAXIMO_TAMANO_CAMPO,
      fields: MAXIMO_CAMPOS,
      fileSize: TAMANO_MAXIMO_FOTO_INCIDENCIA,
      files: CANTIDAD_MAXIMA_FOTOS_INCIDENCIA,
      parts: MAXIMO_PARTES,
    },
  },
);

@Injectable()
export class FotosIncidenciaInterceptor implements NestInterceptor {
  private readonly multipart = new MultipartFotosBase();

  async intercept(context: ExecutionContext, next: CallHandler) {
    try {
      return await this.multipart.intercept(context, next);
    } catch (error) {
      const respuesta = this.normalizarErrorMultipart(error);
      if (respuesta) throw respuesta;
      throw error;
    }
  }

  private normalizarErrorMultipart(error: unknown): BadRequestException | null {
    if (!(error instanceof HttpException)) {
      return error instanceof Error
        ? this.badRequest('El formulario de la incidencia no es válido.')
        : null;
    }

    const response = error.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : typeof response === 'object' &&
            response !== null &&
            'message' in response &&
            typeof response.message === 'string'
          ? response.message
          : error.message;

    if (error.getStatus() === 413 || message.includes('File too large')) {
      return this.badRequest(MENSAJE_FOTOS_INCIDENCIA_INVALIDAS);
    }

    if (error.getStatus() !== 400) return null;

    if (message.includes('Unexpected field')) {
      if (message.endsWith(' - fotos')) {
        return this.badRequest(
          `Se permite un máximo de ${CANTIDAD_MAXIMA_FOTOS_INCIDENCIA} fotos.`,
        );
      }
      return this.badRequest('El único campo de archivo permitido es fotos.');
    }

    if (message.includes('Too many files')) {
      return this.badRequest(
        `Se permite un máximo de ${CANTIDAD_MAXIMA_FOTOS_INCIDENCIA} fotos.`,
      );
    }

    if (message.includes('Field value too long') && message.includes('descripcion')) {
      return this.badRequest(MENSAJE_DESCRIPCION_INVALIDA);
    }

    return this.badRequest('El formulario de la incidencia no es válido.');
  }

  private badRequest(message: string): BadRequestException {
    return new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message,
      ...(message === MENSAJE_FOTOS_INCIDENCIA_INVALIDAS ||
      message.includes('fotos')
        ? { campo: 'fotos' }
        : {}),
    });
  }
}
