import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  IsUUID,
  Length,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const LUGARES_INCIDENCIA = ['UNIDAD', 'AREA_COMUN'] as const;
export type LugarIncidencia = (typeof LUGARES_INCIDENCIA)[number];

export const CATEGORIAS_INCIDENCIA = [
  'FUGA',
  'ELECTRICIDAD',
  'ASCENSOR',
  'LIMPIEZA',
  'SEGURIDAD',
  'OTRO',
] as const;
export type CategoriaIncidencia = (typeof CATEGORIAS_INCIDENCIA)[number];

export const MENSAJE_DESCRIPCION_INVALIDA =
  'La descripción debe tener entre 10 y 500 caracteres';

interface LugarIncidenciaInput {
  lugarTipo?: unknown;
  unidadId?: unknown;
  areaId?: unknown;
}

@ValidatorConstraint({ name: 'lugarIncidenciaValido', async: false })
export class LugarIncidenciaValidoConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as LugarIncidenciaInput;

    if (dto.lugarTipo === 'UNIDAD') {
      return typeof dto.unidadId === 'string' && dto.areaId === undefined;
    }

    if (dto.lugarTipo === 'AREA_COMUN') {
      return typeof dto.areaId === 'string' && dto.unidadId === undefined;
    }

    return false;
  }

  defaultMessage(): string {
    return 'Para UNIDAD envíe solo unidadId; para AREA_COMUN envíe solo areaId.';
  }
}

/**
 * Campos de texto de POST /incidencias. Las fotos viajan como partes de archivo
 * multipart y se procesan por separado; no forman parte del DTO del body.
 */
export class CrearIncidenciaDto {
  @ApiProperty({ enum: LUGARES_INCIDENCIA, example: 'UNIDAD' })
  @IsIn(LUGARES_INCIDENCIA, { message: 'lugarTipo debe ser UNIDAD o AREA_COMUN.' })
  @Validate(LugarIncidenciaValidoConstraint)
  lugarTipo!: LugarIncidencia;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsUUID(undefined, { message: 'unidadId debe ser un UUID válido.' })
  unidadId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsUUID(undefined, { message: 'areaId debe ser un UUID válido.' })
  areaId?: string;

  @ApiProperty({ enum: CATEGORIAS_INCIDENCIA, example: 'FUGA' })
  @IsIn(CATEGORIAS_INCIDENCIA, { message: 'categoria no es válida.' })
  categoria!: CategoriaIncidencia;

  @ApiProperty({ minLength: 10, maxLength: 500 })
  @IsString({ message: MENSAJE_DESCRIPCION_INVALIDA })
  @Length(10, 500, { message: MENSAJE_DESCRIPCION_INVALIDA })
  descripcion!: string;
}
