import { Prioridad } from '@PrismaClient';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  isUUID,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

interface ActualizarAsignacionInput {
  prioridad?: unknown;
  responsableId?: unknown;
}

@ValidatorConstraint({ name: 'responsableIdOprioridad', async: false })
export class ResponsableIdOprioridadConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as ActualizarAsignacionInput;
    if (value === undefined) return dto.prioridad !== undefined;
    return typeof value === 'string' && isUUID(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return args.value === undefined
      ? 'Debe indicar al menos una prioridad o un responsable'
      : 'responsableId debe ser un UUID válido.';
  }
}

export class ActualizarAsignacionDto implements ActualizarAsignacionInput {
  @ApiPropertyOptional({
    enum: Prioridad,
    enumName: 'Prioridad',
    nullable: false,
    description:
      'Nueva prioridad; al omitirla se conserva la actual. No admite null. Debe enviarse prioridad o responsableId.',
  })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsEnum(Prioridad, {
    message: 'prioridad debe ser BAJA, MEDIA, ALTA o URGENTE y no admite null.',
  })
  prioridad?: Prioridad;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: false,
    description:
      'UUID de un responsable activo con rol ADMINISTRADOR o SEGURIDAD; al omitirlo se conserva el actual. No admite null. Debe enviarse prioridad o responsableId.',
  })
  @Validate(ResponsableIdOprioridadConstraint)
  responsableId?: string;
}
