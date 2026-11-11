import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Alcance } from '@PrismaClient';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class AudienciaComunicadoDto {
  @IsEnum(Alcance) alcance!: Alcance;
  @ValidateIf(
    (dto: AudienciaComunicadoDto) =>
      dto.alcance !== 'TODOS' || dto.destinoId !== undefined,
  )
  @IsUUID()
  destinoId?: string;
}
export class CrearComunicadoDto extends AudienciaComunicadoDto {
  @Transform(trim) @IsString() @Length(5, 100) titulo!: string;
  @Transform(trim) @IsString() @Length(1, 2000) contenido!: string;
}
export class PaginaComunicadosDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) tamanoPagina = 10;
}
