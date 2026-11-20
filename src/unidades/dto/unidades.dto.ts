import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

export class ListarUnidadesDto {
  // La pantalla de recepción de paquetes busca mientras se teclea, así que el
  // mínimo es 1: a diferencia del buscador de la puerta, acá no hay un costo
  // en mostrar muchas coincidencias.
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 50)
  buscar?: string;
}
