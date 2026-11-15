import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length, Matches } from 'class-validator';

/** H2: datos para pagar una cuota. La tarjeta y el CVV solo se usan en memoria. */
export class CrearPagoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'La cuota no es válida' })
  cuotaId!: string;

  @ApiProperty({ example: '4242424242424242' })
  @Matches(/^\d{16}$/, {
    message: 'El número de tarjeta debe tener 16 dígitos',
  })
  numeroTarjeta!: string;

  @ApiProperty({ example: 'Rosa Martínez' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 60, { message: 'El titular debe tener entre 3 y 60 caracteres' })
  titular!: string;

  @ApiProperty({ example: '12/27', description: 'MM/AA' })
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Use el formato MM/AA' })
  vencimiento!: string;

  @ApiProperty({ example: '123' })
  @Matches(/^\d{3}$/, {
    message: 'El código de seguridad debe tener 3 dígitos',
  })
  cvv!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Generada por el cliente en cada intento; evita cobros duplicados',
  })
  @IsUUID('all', { message: 'La clave de idempotencia no es válida' })
  idempotencyKey!: string;
}
