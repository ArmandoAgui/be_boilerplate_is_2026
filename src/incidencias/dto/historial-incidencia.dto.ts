import { ApiProperty } from '@nestjs/swagger';
import { CampoHistorial } from '@PrismaClient';

export interface HistorialIncidenciaEntity {
  readonly campo: CampoHistorial;
  readonly valorAnterior: string | null;
  readonly valorNuevo: string;
  readonly actor: { readonly nombre: string };
  readonly createdAt: Date;
}

export class HistorialIncidenciaDto {
  @ApiProperty({ enum: CampoHistorial, enumName: 'CampoHistorial' })
  campo!: CampoHistorial;

  @ApiProperty({ type: String, nullable: true })
  valorAnterior!: string | null;

  @ApiProperty({ type: String })
  valorNuevo!: string;

  @ApiProperty({ type: String })
  actor!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  fecha!: string;

  static fromEntity(entity: HistorialIncidenciaEntity): HistorialIncidenciaDto {
    return {
      campo: entity.campo,
      valorAnterior: entity.valorAnterior,
      valorNuevo: entity.valorNuevo,
      actor: entity.actor.nombre,
      fecha: entity.createdAt.toISOString(),
    };
  }
}
