import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

// Cuarta copia idéntica de este filtro (reservas, visitas, cuotas y acá). Deja
// la respuesta con la forma de KAN-10 y aplana el arreglo de class-validator.
// Candidato claro a @Common: lo dejo duplicado para no tocar los módulos de
// los demás en este PR.
@Catch(HttpException)
export class UnidadesHttpFilter implements ExceptionFilter {
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
