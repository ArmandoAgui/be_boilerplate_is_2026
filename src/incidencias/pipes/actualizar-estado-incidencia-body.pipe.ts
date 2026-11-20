import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarEstadoIncidenciaDto } from '../dto/actualizar-estado-incidencia.dto.js';

@Injectable()
export class ActualizarEstadoIncidenciaBodyPipe implements PipeTransform<
  unknown,
  Promise<ActualizarEstadoIncidenciaDto>
> {
  async transform(value: unknown): Promise<ActualizarEstadoIncidenciaDto> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'El cuerpo debe ser un objeto JSON.',
        campo: 'body',
      });
    }

    const dto = plainToInstance(ActualizarEstadoIncidenciaDto, value);
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
      const campo = primero?.property;
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: mensaje ?? 'El cuerpo de estado no es válido.',
        ...(campo ? { campo } : {}),
      });
    }

    return dto;
  }
}
