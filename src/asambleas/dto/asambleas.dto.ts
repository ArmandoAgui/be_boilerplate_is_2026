import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { EstadoAsamblea } from '@PrismaClient';

export class CrearOpcionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  texto!: string;
}

export class CrearTemaDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 150)
  titulo!: string;

  @IsISO8601({ strict: true })
  apertura!: string;

  @IsISO8601({ strict: true })
  cierre!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CrearOpcionDto)
  opciones!: CrearOpcionDto[];
}

export class CrearAsambleaDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 100)
  titulo!: string;

  @IsISO8601({ strict: true })
  fechaHora!: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(0, 500)
  descripcion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearTemaDto)
  temas!: CrearTemaDto[];
}

export class ListarAsambleasDto {
  @IsOptional()
  @IsEnum(EstadoAsamblea)
  estado?: EstadoAsamblea;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  tamanoPagina = 20;
}
