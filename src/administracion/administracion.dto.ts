import {
  IsUUID,
  IsString,
  Length,
  IsOptional,
  ValidateIf,
  IsIn,
  Matches,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
export class VinculoDto {
  @IsUUID() userId!: string;
  @IsUUID() unidadId!: string;
}
export class AjusteCuotaDto {
  @ValidateIf((_o, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  monto?: number;
  @ValidateIf((_o, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  fechaVencimiento?: string;
  @ValidateIf((_o, value) => value !== undefined)
  @IsIn(['ANULADA'])
  estado?: 'ANULADA';
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(5, 300)
  motivo!: string;
}
export class PaginaAdminDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) pagina = 1;
}
export class EntregaDto {
  @IsUUID() residenteId!: string;
}
export class CorreccionPaqueteDto {
  @ValidateIf((_o, value) => value !== undefined)
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(2, 60)
  empresa?: string;
  @ValidateIf((_o, value) => value !== undefined)
  @IsString()
  @Length(0, 120)
  descripcion?: string;
  @ValidateIf((_o, value) => value !== undefined)
  @IsIn(['ANULADO'])
  estado?: 'ANULADO';
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(5, 300)
  motivo!: string;
}
