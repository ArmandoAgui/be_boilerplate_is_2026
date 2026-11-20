import { ApiProperty } from '@nestjs/swagger';

/** Únicos datos públicos del responsable expuestos por H10. */
export class ResponsableIncidenciaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;
}

export class ListadoResponsablesDto {
  @ApiProperty({ type: [ResponsableIncidenciaDto] })
  datos!: ResponsableIncidenciaDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1 })
  pagina!: number;

  @ApiProperty({ minimum: 1, maximum: 50 })
  tamanoPagina!: number;
}
