import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { EstadoPaquete } from '@PrismaClient';

export class ListarMisPaquetesDto {
  @IsUUID()
  unidadId!: string;

  @IsEnum(EstadoPaquete)
  estado!: EstadoPaquete;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  tamanoPagina = 20;
}
