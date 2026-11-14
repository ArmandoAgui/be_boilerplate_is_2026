import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsIn } from 'class-validator';
import {
  ESTADOS_DESTINO_H11,
  type EstadoIncidenciaDestino,
} from '../services/estado-incidencia.rules.js';

export class ActualizarEstadoIncidenciaDto {
  @ApiProperty({
    enum: ESTADOS_DESTINO_H11,
    enumName: 'EstadoIncidenciaDestinoH11',
    description: 'H11 solo permite EN_PROCESO o RESUELTA como destino.',
  })
  @IsDefined({ message: 'El estado debe ser EN_PROCESO o RESUELTA.' })
  @IsIn(ESTADOS_DESTINO_H11, {
    message: 'El estado debe ser EN_PROCESO o RESUELTA.',
  })
  estado!: EstadoIncidenciaDestino;
}
