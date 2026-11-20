import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Sobre de error que publica el filtro HTTP del módulo de incidencias. */
export class IncidenciaErrorDto {
  @ApiProperty({
    enum: [400, 401, 403, 404, 409, 500],
    example: 400,
    description: 'Código HTTP de la respuesta.',
  })
  statusCode!: number;

  @ApiProperty({
    enum: [
      'Bad Request',
      'Unauthorized',
      'Forbidden',
      'Not Found',
      'Conflict',
      'Internal Server Error',
    ],
    example: 'Bad Request',
  })
  error!: string;

  @ApiProperty({ example: 'Elija un responsable válido' })
  message!: string;

  @ApiPropertyOptional({
    example: 'responsableId',
    description: 'Propiedad asociada al error, cuando aplica.',
  })
  campo?: string;
}
