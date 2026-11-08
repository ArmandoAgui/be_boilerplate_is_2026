import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

// Deja la respuesta de error con la forma que fija KAN-10 (statusCode, error,
// message). class-validator devuelve message como arreglo y acá se aplana.
@Catch(HttpException)
export class VisitasHttpFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const statusCode = exception.getStatus();
    const body = exception.getResponse();
    const detalle =
      typeof body === 'string'
        ? { message: body }
        : (body as { message?: string | string[]; error?: string });
    const message = Array.isArray(detalle.message)
      ? detalle.message.join('; ')
      : (detalle.message ?? exception.message);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, error: detalle.error ?? exception.name, message });
  }
}
