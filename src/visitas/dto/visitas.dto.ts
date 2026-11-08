import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

// VENCIDA no existe en la base: se deriva de fin. El filtro de la bandeja sí
// la acepta, así que el enum del DTO no puede ser el de Prisma.
export const ESTADOS_AUTORIZACION = [
  'VIGENTE',
  'USADA',
  'CANCELADA',
  'VENCIDA',
] as const;
export type EstadoAutorizacionFiltro = (typeof ESTADOS_AUTORIZACION)[number];

const ISO_CON_ZONA =
  /T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export class CrearAutorizacionDto {
  @IsUUID() unidadId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 100)
  visitanteNombre!: string;

  // DUI o pasaporte: alfanumérico sin guiones ni espacios, para que el dato
  // que seguridad teclea en la puerta coincida con el registrado.
  @Matches(/^[A-Za-z0-9]{5,20}$/, {
    message: 'El documento debe tener de 5 a 20 caracteres alfanuméricos',
  })
  visitanteDocumento!: string;

  // Se exige la zona horaria explícita: sin ella, "2026-11-10T08:00" se
  // interpretaría como UTC y la vigencia quedaría corrida seis horas.
  @IsISO8601({ strict: true })
  @Matches(ISO_CON_ZONA, { message: 'Indique la zona horaria en inicio' })
  inicio!: string;

  @IsISO8601({ strict: true })
  @Matches(ISO_CON_ZONA, { message: 'Indique la zona horaria en fin' })
  fin!: string;
}

export class ListarAutorizacionesDto {
  @IsOptional() @IsIn(ESTADOS_AUTORIZACION) estado?: EstadoAutorizacionFiltro;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) tamanoPagina = 20;
}
