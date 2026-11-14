import { ApiProperty } from '@nestjs/swagger';

/** Sobre de error estándar de Nest usado por validación y guards. */
export class NotificacionesErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: ['pagina debe ser un entero.'],
  })
  message!: string | string[];
}
