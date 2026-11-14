import { EstadoIncidencia } from '@PrismaClient';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, ValidateIf } from 'class-validator';
import { PaginacionQueryDto } from './paginacion-query.dto.js';

/** Filtros permitidos para la bandeja propia de incidencias H12. */
export class ListarIncidenciasMiasDto extends PaginacionQueryDto {
  @ApiPropertyOptional({
    enum: EstadoIncidencia,
    enumName: 'EstadoIncidencia',
    description:
      'Filtra los reportes propios por estado. Omitirlo incluye todos los estados.',
  })
  @ValidateIf((_dto, value) => value !== undefined)
  @IsEnum(EstadoIncidencia, {
    message: 'estado debe ser ABIERTA, ASIGNADA, EN_PROCESO o RESUELTA.',
  })
  estado?: EstadoIncidencia;
}
