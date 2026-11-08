import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
@Catch(HttpException)
export class ReservasHttpFilter implements ExceptionFilter {
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
