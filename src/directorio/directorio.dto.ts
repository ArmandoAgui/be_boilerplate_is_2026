import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class PreferenciasDirectorioDto {
  @IsBoolean() visible!: boolean;
  @IsBoolean() mostrarTelefono!: boolean;
  @IsBoolean() mostrarCorreo!: boolean;
  @IsBoolean() mostrarUnidad!: boolean;
}
export class BuscarDirectorioDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 50)
  buscar!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) tamanoPagina = 20;
}
