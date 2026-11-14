import { ApiProperty } from '@nestjs/swagger';
import { EstadoIncidencia } from '@PrismaClient';
import type { EstadoIncidenciaDestino } from '../services/estado-incidencia.rules.js';

export interface EstadoIncidenciaActualizadaEntity {
  readonly id: string;
  readonly estado: EstadoIncidenciaDestino;
  readonly updatedAt: Date;
}

export class EstadoIncidenciaActualizadoDto {
  @ApiProperty({ format: 'uuid', description: 'UUID de la incidencia.' })
  id!: string;

  @ApiProperty({
    enum: [EstadoIncidencia.EN_PROCESO, EstadoIncidencia.RESUELTA],
    enumName: 'EstadoIncidenciaDestinoH11',
  })
  estado!: EstadoIncidenciaDestino;

  @ApiProperty({
    format: 'date-time',
    description: 'Fecha UTC en que se confirmó el cambio de estado.',
  })
  actualizadaAt!: string;

  static fromEntity(
    entity: EstadoIncidenciaActualizadaEntity,
  ): EstadoIncidenciaActualizadoDto {
    return {
      id: entity.id,
      estado: entity.estado,
      actualizadaAt: entity.updatedAt.toISOString(),
    };
  }
}
