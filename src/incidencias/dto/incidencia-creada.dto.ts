import { ApiProperty } from '@nestjs/swagger';
import { CATEGORIAS_INCIDENCIA } from './crear-incidencia.dto.js';
import type { CategoriaIncidencia } from './crear-incidencia.dto.js';
import { EvidenciaIncidenciaDto } from './evidencia-incidencia.dto.js';

const ESTADOS_INCIDENCIA = ['ABIERTA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA'] as const;

export interface IncidenciaCreadaEntity {
  id: string;
  codigo: string;
  categoria: CategoriaIncidencia;
  estado: (typeof ESTADOS_INCIDENCIA)[number];
  createdAt: Date;
  evidencias: Array<{ id: string }>;
}

export class IncidenciaCreadaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INC-0001' })
  codigo!: string;

  @ApiProperty({ enum: ESTADOS_INCIDENCIA, example: 'ABIERTA' })
  estado!: (typeof ESTADOS_INCIDENCIA)[number];

  @ApiProperty({ enum: CATEGORIAS_INCIDENCIA })
  categoria!: CategoriaIncidencia;

  @ApiProperty({ type: String, format: 'date-time' })
  creadaAt!: string;

  @ApiProperty({ type: [EvidenciaIncidenciaDto] })
  evidencias!: EvidenciaIncidenciaDto[];

  static fromEntity(entity: IncidenciaCreadaEntity): IncidenciaCreadaDto {
    return {
      id: entity.id,
      codigo: entity.codigo,
      estado: entity.estado,
      categoria: entity.categoria,
      creadaAt: entity.createdAt.toISOString(),
      evidencias: entity.evidencias.map((evidencia) =>
        EvidenciaIncidenciaDto.fromId(entity.id, evidencia.id),
      ),
    };
  }
}
