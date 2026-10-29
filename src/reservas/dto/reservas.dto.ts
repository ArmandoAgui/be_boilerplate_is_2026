import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { EstadoReserva } from '@PrismaClient';

export class HorarioDto {
  @IsInt() @Min(0) @Max(6) diaSemana!: number;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) horaInicio!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) horaFin!: string;
}
export class CrearAreaDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 60)
  nombre!: string;
  @IsInt() @Min(1) @Max(500) capacidad!: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  activa?: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(168)
  @ValidateNested({ each: true })
  @Type(() => HorarioDto)
  horarios!: HorarioDto[];
}
export class EditarAreaDto extends PartialType(CrearAreaDto, {
  skipNullProperties: false,
}) {}
export class FechaDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha!: string;
}
export class CrearReservaDto {
  @IsUUID() areaId!: string;
  @IsUUID() unidadId!: string;
  @IsISO8601({ strict: true })
  @Matches(/T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/)
  inicio!: string;
  @IsInt() @Min(1) @Max(4) duracionHoras!: number;
  @IsInt() @Min(1) asistentes!: number;
}
export class ListarReservasDto {
  @IsOptional() @IsEnum(EstadoReserva) estado?: EstadoReserva;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) tamanoPagina = 20;
}
