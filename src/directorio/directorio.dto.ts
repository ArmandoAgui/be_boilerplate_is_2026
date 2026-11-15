import { IsBoolean } from 'class-validator';
export class PreferenciasDirectorioDto {
  @IsBoolean() visible!: boolean;
  @IsBoolean() mostrarTelefono!: boolean;
  @IsBoolean() mostrarCorreo!: boolean;
  @IsBoolean() mostrarUnidad!: boolean;
}
