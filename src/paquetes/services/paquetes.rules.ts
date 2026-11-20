import { ForbiddenException } from '@nestjs/common';
import type { Rol } from '@PrismaClient';

export const LARGO_CORRELATIVO = 6;

// Duplicado a propósito, igual que en los demás módulos.
export function permitir(rol: Rol, ...roles: Rol[]): void {
  if (!roles.includes(rol))
    throw new ForbiddenException(
      'No tienes permiso para realizar esta operación',
    );
}

/**
 * Arma el código a partir del número que entrega la secuencia de Postgres.
 * Se rellena a seis dígitos para que ordenar por texto coincida con ordenar
 * por número, hasta PAQ-999999. Pasado ese punto el código crece de largo y
 * deja de ordenar bien, cosa que este condominio no va a ver nunca, pero que
 * conviene saber si alguien reutiliza esto.
 */
export function codigoPaquete(numero: bigint | number): string {
  return `PAQ-${String(numero).padStart(LARGO_CORRELATIVO, '0')}`;
}
