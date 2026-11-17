import { ApiProperty } from '@nestjs/swagger';
import { Categoria, EstadoIncidencia, Prioridad } from '@PrismaClient';
import { EvidenciaIncidenciaDto } from './evidencia-incidencia.dto.js';
import {
  HistorialIncidenciaDto,
  type HistorialIncidenciaEntity,
} from './historial-incidencia.dto.js';
import { ResponsableIncidenciaDto } from './responsable-incidencia.dto.js';

export interface IncidenciaDetalleEntity {
  readonly id: string;
  readonly codigo: string;
  readonly categoria: Categoria;
  readonly descripcion: string;
  readonly lugar: string;
  readonly estado: EstadoIncidencia;
  readonly prioridad: Prioridad | null;
  readonly responsable: { readonly id: string; readonly nombre: string } | null;
  readonly evidencias: readonly { readonly id: string }[];
  readonly historial: readonly HistorialIncidenciaEntity[];
}

/** Proyección privada y explícita de GET /incidencias/:id. */
export class IncidenciaDetalleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INC-0001' })
  codigo!: string;

  @ApiProperty({ enum: Categoria, enumName: 'Categoria' })
  categoria!: Categoria;

  @ApiProperty({ maxLength: 500 })
  descripcion!: string;

  @ApiProperty({ description: 'Código de unidad o nombre de área común.' })
  lugar!: string;

  @ApiProperty({ enum: EstadoIncidencia, enumName: 'EstadoIncidencia' })
  estado!: EstadoIncidencia;

  @ApiProperty({ enum: Prioridad, enumName: 'Prioridad', nullable: true })
  prioridad!: Prioridad | null;

  @ApiProperty({ type: ResponsableIncidenciaDto, nullable: true })
  responsable!: ResponsableIncidenciaDto | null;

  @ApiProperty({ type: [EvidenciaIncidenciaDto] })
  evidencias!: EvidenciaIncidenciaDto[];

  @ApiProperty({ type: [HistorialIncidenciaDto] })
  historial!: HistorialIncidenciaDto[];

  static fromEntity(entity: IncidenciaDetalleEntity): IncidenciaDetalleDto {
    return {
      id: entity.id,
      codigo: entity.codigo,
      categoria: entity.categoria,
      descripcion: entity.descripcion,
      lugar: entity.lugar,
      estado: entity.estado,
      prioridad: entity.prioridad,
      responsable: entity.responsable
        ? {
            id: entity.responsable.id,
            nombre: entity.responsable.nombre,
          }
        : null,
      evidencias: entity.evidencias.map((evidencia) =>
        EvidenciaIncidenciaDto.fromId(entity.id, evidencia.id),
      ),
      historial: entity.historial.map((entrada) =>
        HistorialIncidenciaDto.fromEntity(entrada),
      ),
    };
  }
}
