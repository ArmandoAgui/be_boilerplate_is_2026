import { EstadoIncidencia, Prioridad } from '@PrismaClient';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, ValidateIf } from 'class-validator';
import { PaginacionQueryDto } from './paginacion-query.dto.js';

export class ListarIncidenciasDto extends PaginacionQueryDto {
  @ApiPropertyOptional({
    enum: EstadoIncidencia,
    enumName: 'EstadoIncidencia',
    description: 'Filtra por estado persistido de la incidencia.',
  })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsEnum(EstadoIncidencia, {
    message: 'estado debe ser ABIERTA, ASIGNADA, EN_PROCESO o RESUELTA.',
  })
  estado?: EstadoIncidencia;

  @ApiPropertyOptional({
    enum: Prioridad,
    enumName: 'Prioridad',
    description: 'Filtra por prioridad; omitir incluye prioridades nulas.',
  })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsEnum(Prioridad, {
    message: 'prioridad debe ser BAJA, MEDIA, ALTA o URGENTE.',
  })
  prioridad?: Prioridad;
}
