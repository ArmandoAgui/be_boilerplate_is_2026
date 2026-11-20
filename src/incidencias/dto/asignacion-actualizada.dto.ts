import { EstadoIncidencia, Prioridad } from '@PrismaClient';
import { ApiProperty } from '@nestjs/swagger';
import { ResponsableIncidenciaDto } from './responsable-incidencia.dto.js';

export class AsignacionActualizadaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: Prioridad, enumName: 'Prioridad', nullable: true })
  prioridad!: Prioridad | null;

  @ApiProperty({ type: ResponsableIncidenciaDto, nullable: true })
  responsable!: ResponsableIncidenciaDto | null;

  @ApiProperty({ enum: EstadoIncidencia, enumName: 'EstadoIncidencia' })
  estado!: EstadoIncidencia;
}
