import { BadRequestException } from '@nestjs/common';
import { mesLocal } from '../../cuotas/services/cuotas.rules.js';

// El Salvador usa UTC-6 todo el año (sin horario de verano).
const DESFASE_SV_MS = 6 * 60 * 60 * 1000;

export const TARJETA_APROBADA = '4242';
export const TARJETA_SIN_FONDOS = '0002';
export const MOTIVO_SIN_FONDOS = 'Fondos insuficientes';
export const MOTIVO_NO_RECONOCIDA = 'Tarjeta no reconocida';

export interface ResultadoPasarela {
  aprobado: boolean;
  motivoRechazo: string | null;
}

/** H2: reglas de la pasarela simulada, según los últimos 4 dígitos. */
export function resolverPasarela(numeroTarjeta: string): ResultadoPasarela {
  if (numeroTarjeta.endsWith(TARJETA_APROBADA))
    return { aprobado: true, motivoRechazo: null };
  if (numeroTarjeta.endsWith(TARJETA_SIN_FONDOS))
    return { aprobado: false, motivoRechazo: MOTIVO_SIN_FONDOS };
  return { aprobado: false, motivoRechazo: MOTIVO_NO_RECONOCIDA };
}

/** Lo único que se guarda de la tarjeta. */
export function ultimos4(numeroTarjeta: string): string {
  return numeroTarjeta.slice(-4);
}

/** Referencia del comprobante: PAG-AAAAMMDD-000001, con la fecha de El Salvador. */
export function referenciaPago(ahora: Date, numero: number): string {
  const fecha = new Date(ahora.getTime() - DESFASE_SV_MS)
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');
  return `PAG-${fecha}-${String(numero).padStart(6, '0')}`;
}

/**
 * H2: el vencimiento MM/AA no puede ser anterior al mes actual (400).
 * El formato ya lo validó el DTO; aquí solo se compara contra hoy.
 */
export function validarVencimientoTarjeta(mmaa: string, ahora: Date): void {
  const [mes, anio] = mmaa.split('/');
  const vence = `20${anio}-${mes}`;
  if (vence < mesLocal(ahora)) {
    throw new BadRequestException('La tarjeta está vencida');
  }
}
