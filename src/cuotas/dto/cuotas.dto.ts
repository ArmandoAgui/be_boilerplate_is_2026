import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/** Período AAAA-MM. Se usa en la query de la vista previa y en el cuerpo del POST. */
export class PeriodoDto {
  @ApiProperty({
    example: '2026-12',
    description: 'Período en formato AAAA-MM',
  })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Use el formato AAAA-MM' })
  periodo!: string;
}
