import { ModuloOrigen, EstadoNotificacion } from '@PrismaClient';
import { Transform, type TransformFnParams } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, Max, Min, ValidateIf } from 'class-validator';

const PAGINA_MAXIMA_SEGURA = Math.floor(Number.MAX_SAFE_INTEGER / 50) + 1;

function transformarEnteroQuery({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
    return value;
  }

  const numero = Number(value);
  return Number.isSafeInteger(numero) ? numero : value;
}

/** Filtros estrictos de la bandeja personal H27. */
export class ListarNotificacionesQueryDto {
  @ApiPropertyOptional({
    type: String,
    enum: ModuloOrigen,
    enumName: 'ModuloOrigen',
    description: 'Limita los avisos a un módulo de origen.',
    example: ModuloOrigen.INCIDENCIAS,
  })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsEnum(ModuloOrigen, {
    message:
      'moduloOrigen debe ser CUOTAS, PAQUETERIA, COMUNICADOS, ASAMBLEAS o INCIDENCIAS.',
  })
  moduloOrigen?: ModuloOrigen;

  @ApiPropertyOptional({
    type: String,
    enum: EstadoNotificacion,
    enumName: 'EstadoNotificacion',
    description: 'Limita los avisos al estado indicado.',
    example: EstadoNotificacion.NO_LEIDA,
  })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsEnum(EstadoNotificacion, {
    message: 'estado debe ser NO_LEIDA o LEIDA.',
  })
  estado?: EstadoNotificacion;

  @ApiPropertyOptional({
    type: Number,
    description: 'Página solicitada, comenzando en 1.',
    minimum: 1,
    default: 1,
  })
  @Transform(transformarEnteroQuery)
  @ValidateIf((_dto, value) => value !== undefined)
  @IsInt({ message: 'pagina debe ser un entero.' })
  @Min(1, { message: 'pagina debe ser mayor o igual a 1.' })
  @Max(PAGINA_MAXIMA_SEGURA, {
    message: 'pagina excede el rango seguro permitido.',
  })
  pagina = 1;

  @ApiPropertyOptional({
    type: Number,
    description: 'Cantidad de resultados por página.',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @Transform(transformarEnteroQuery)
  @ValidateIf((_dto, value) => value !== undefined)
  @IsInt({ message: 'tamanoPagina debe ser un entero.' })
  @Min(1, { message: 'tamanoPagina debe ser mayor o igual a 1.' })
  @Max(50, { message: 'tamanoPagina no puede ser mayor a 50.' })
  tamanoPagina = 20;
}
