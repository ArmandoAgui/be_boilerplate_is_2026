import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

// Misma copia que en los demás módulos: forma de error de KAN-10 y aplanado
// del arreglo de class-validator.
@Catch(HttpException)
export class PaquetesHttpFilter implements ExceptionFilter {
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
