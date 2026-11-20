import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarAsignacionDto } from '../dto/actualizar-asignacion.dto.js';

/**
 * Valida forma, campos y reglas del body PATCH, incluidos null y arrays.
 * Úsese con un parámetro `unknown` en @Body para validar el valor JSON crudo
 * antes de que la ValidationPipe global intente convertirlo a una clase.
 */
@Injectable()
export class ActualizarAsignacionBodyPipe implements PipeTransform<
  unknown,
  Promise<ActualizarAsignacionDto>
> {
  async transform(value: unknown): Promise<ActualizarAsignacionDto> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'El cuerpo debe ser un objeto JSON.',
        campo: 'body',
      });
    }

    const dto = plainToInstance(ActualizarAsignacionDto, value);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    if (errors.length > 0) {
      const primero =
        errors.find((error) => error.constraints?.whitelistValidation) ??
        errors[0];
      const mensaje = primero
        ? Object.values(primero.constraints ?? {})[0]
        : undefined;
      const campo =
        primero?.constraints?.whitelistValidation && primero.property
          ? primero.property
          : mensaje?.startsWith('Debe indicar al menos')
            ? undefined
            : primero?.property;
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: mensaje ?? 'El cuerpo de asignación no es válido.',
        ...(campo ? { campo } : {}),
      });
    }

    return dto;
  }
}
