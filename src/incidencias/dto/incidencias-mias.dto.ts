import { ApiProperty } from '@nestjs/swagger';
import { Categoria, EstadoIncidencia } from '@PrismaClient';

export interface IncidenciaMiaEntity {
  readonly id: string;
  readonly codigo: string;
  readonly categoria: Categoria;
  readonly createdAt: Date;
  readonly estado: EstadoIncidencia;
}

export class IncidenciaMiaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INC-0001' })
  codigo!: string;

  @ApiProperty({ enum: Categoria, enumName: 'Categoria' })
  categoria!: Categoria;

  @ApiProperty({ type: String, format: 'date-time' })
  creadaAt!: string;

  @ApiProperty({ enum: EstadoIncidencia, enumName: 'EstadoIncidencia' })
  estado!: EstadoIncidencia;

  static fromEntity(entity: IncidenciaMiaEntity): IncidenciaMiaDto {
    return {
      id: entity.id,
      codigo: entity.codigo,
      categoria: entity.categoria,
      creadaAt: entity.createdAt.toISOString(),
      estado: entity.estado,
    };
  }
}

export interface ListadoIncidenciasMiasEntity {
  readonly datos: readonly IncidenciaMiaEntity[];
  readonly total: number;
  readonly pagina: number;
  readonly tamanoPagina: number;
}

export class ListadoIncidenciasMiasDto {
  @ApiProperty({ type: [IncidenciaMiaDto] })
  datos!: IncidenciaMiaDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1 })
  pagina!: number;

  @ApiProperty({ minimum: 1, maximum: 50 })
  tamanoPagina!: number;

  static fromEntity(
    entity: ListadoIncidenciasMiasEntity,
  ): ListadoIncidenciasMiasDto {
    return {
      datos: entity.datos.map((incidencia) =>
        IncidenciaMiaDto.fromEntity(incidencia),
      ),
      total: entity.total,
      pagina: entity.pagina,
      tamanoPagina: entity.tamanoPagina,
    };
  }
}
