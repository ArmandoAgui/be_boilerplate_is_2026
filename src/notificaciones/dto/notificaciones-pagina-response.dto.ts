import { ApiProperty } from '@nestjs/swagger';
import { NotificacionResponseDto } from './notificacion-response.dto.js';

/** Respuesta compartida por la bandeja y el contador de avisos. */
export class NotificacionesPaginaResponseDto {
  @ApiProperty({ type: [NotificacionResponseDto] })
  datos!: NotificacionResponseDto[];

  @ApiProperty({ minimum: 0, description: 'Avisos propios sin leer, sin filtros.' })
  noLeidas!: number;

  @ApiProperty({ minimum: 0, description: 'Avisos propios que coinciden con los filtros.' })
  total!: number;

  @ApiProperty({ minimum: 1, description: 'Página actual.' })
  pagina!: number;

  @ApiProperty({ minimum: 1, maximum: 50, description: 'Tamaño solicitado.' })
  tamanoPagina!: number;
}
