import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** H29/H30: período del reporte, en días de calendario de El Salvador. */
export class RangoReporteDto {
  @ApiProperty({
    example: '2026-11-01',
    description: 'Fecha inicial AAAA-MM-DD',
  })
  @Matches(FECHA, { message: 'Desde debe tener el formato AAAA-MM-DD' })
  desde!: string;

  @ApiProperty({ example: '2026-11-15', description: 'Fecha final AAAA-MM-DD' })
  @Matches(FECHA, { message: 'Hasta debe tener el formato AAAA-MM-DD' })
  hasta!: string;
}
