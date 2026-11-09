import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class IncidenciaIdParamsDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Identificador de la incidencia.',
  })
  @IsUUID(undefined, { message: 'id debe ser un UUID válido.' })
  id!: string;
}
