import { IsUUID } from 'class-validator';

export class EmitirVotoDto {
  @IsUUID()
  unidadId!: string;

  @IsUUID()
  opcionId!: string;
}

export class ConsultarMiEstadoDto {
  @IsUUID()
  unidadId!: string;
}
