import { EstadoNotificacion } from '@PrismaClient';
import { ApiProperty } from '@nestjs/swagger';

/** Resultado del primer marcado o de una repetición idempotente. */
export class NotificacionLeidaResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: EstadoNotificacion, enumName: 'EstadoNotificacion', example: 'LEIDA' })
  estado!: EstadoNotificacion;

  @ApiProperty({
    format: 'date-time',
    example: '2026-11-11T15:00:00.000Z',
    description: 'Fecha original de lectura en UTC, formato ISO 8601.',
  })
  leidaAt!: string;
}
