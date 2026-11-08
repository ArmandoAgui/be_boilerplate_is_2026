import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  ESTADOS_VISIBLES,
  type EstadoVisible,
} from '../services/cuotas.rules.js';

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

/** H3: período AAAA-MM. Se usa en la query de la vista previa y en el cuerpo del POST. */
export class PeriodoDto {
  @ApiProperty({
    example: '2026-12',
    description: 'Período en formato AAAA-MM',
  })
  @Matches(PERIODO, { message: 'Use el formato AAAA-MM' })
  periodo!: string;
}

/** H1: filtros del estado de cuenta del residente. */
export class ListarMisCuotasDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  unidadId!: string;

  @ApiPropertyOptional({ example: '2026-11' })
  @IsOptional()
  @Matches(PERIODO, { message: 'Use el formato AAAA-MM' })
  periodo?: string;

  @ApiPropertyOptional({ enum: ESTADOS_VISIBLES })
  @IsOptional()
  @IsIn(ESTADOS_VISIBLES)
  estado?: EstadoVisible;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  tamanoPagina: number = 20;
}

/** H4: filtros del reporte de morosidad. */
export class ListarMorosidadDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Sin valor: todas las torres',
  })
  @IsOptional()
  @IsUUID()
  torreId?: string;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  tamanoPagina: number = 20;
}
