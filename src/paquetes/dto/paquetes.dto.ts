import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
export class MisPaquetesDto {
  @IsUUID() unidadId!: string;
  @IsIn(['PENDIENTE','ENTREGADO']) estado!: 'PENDIENTE'|'ENTREGADO';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) tamanoPagina = 20;
}
