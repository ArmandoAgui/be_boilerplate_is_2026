import { EstadoNotificacion, ModuloOrigen, TipoEvento } from '@PrismaClient';
import { ApiProperty } from '@nestjs/swagger';

/** Proyección pública mínima de un aviso, sin userId ni claveEvento. */
export class NotificacionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ModuloOrigen, enumName: 'ModuloOrigen' })
  moduloOrigen!: ModuloOrigen;

  @ApiProperty({ enum: TipoEvento, enumName: 'TipoEvento' })
  tipoEvento!: TipoEvento;

  @ApiProperty({ maxLength: 100 })
  titulo!: string;

  @ApiProperty({ maxLength: 300 })
  mensaje!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    example: '6cbf93f1-8d6d-49c2-9fea-7192cf79f242',
    description:
      'UUID del recurso para navegar, o null cuando el aviso no tiene destino directo.',
  })
  referenciaId!: string | null;

  @ApiProperty({ enum: EstadoNotificacion, enumName: 'EstadoNotificacion' })
  estado!: EstadoNotificacion;

  @ApiProperty({
    format: 'date-time',
    example: '2026-11-11T15:00:00.000Z',
    description: 'Fecha de creación en UTC, formato ISO 8601.',
  })
  creadaAt!: string;
}
