
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export const ESTADOS_PAQUETE = ['PENDIENTE', 'ENTREGADO'] as const;
export type EstadoPaqueteFiltro = (typeof ESTADOS_PAQUETE)[number];

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearPaqueteDto {
  @IsUUID() unidadId!: string;

  // Se recorta antes de medir: "  A " no es una empresa de tres caracteres.
  @IsString() @Transform(recortar) @Length(2, 60) empresa!: string;

  @IsOptional() @IsString() @Transform(recortar) @Length(0, 120)
  descripcion?: string;
}

export class ListarPaquetesDto {
  @IsOptional() @IsIn(ESTADOS_PAQUETE) estado?: EstadoPaqueteFiltro;
  @IsOptional() @IsUUID() unidadId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  tamanoPagina: number = 20;
}
