import { Categoria, EstadoIncidencia, Prioridad } from '@PrismaClient';
import { ApiProperty } from '@nestjs/swagger';
import { ResponsableIncidenciaDto } from './responsable-incidencia.dto.js';

/** Proyección administrativa mínima; excluye autor, descripción y evidencias. */
export class IncidenciaListadoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INC-0001' })
  codigo!: string;

  @ApiProperty({ description: 'Código de unidad o nombre de área común.' })
  lugar!: string;

  @ApiProperty({ enum: Categoria, enumName: 'Categoria' })
  categoria!: Categoria;

  @ApiProperty({ format: 'date-time' })
  creadaAt!: string;

  @ApiProperty({ enum: Prioridad, enumName: 'Prioridad', nullable: true })
  prioridad!: Prioridad | null;

  @ApiProperty({ type: ResponsableIncidenciaDto, nullable: true })
  responsable!: ResponsableIncidenciaDto | null;

  @ApiProperty({ enum: EstadoIncidencia, enumName: 'EstadoIncidencia' })
  estado!: EstadoIncidencia;
}

export class ListadoIncidenciasDto {
  @ApiProperty({ type: [IncidenciaListadoDto] })
  datos!: IncidenciaListadoDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1 })
  pagina!: number;

  @ApiProperty({ minimum: 1, maximum: 50 })
  tamanoPagina!: number;
}
