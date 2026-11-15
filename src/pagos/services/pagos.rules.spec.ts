import { describe, it, expect } from 'vitest';
import {
  referenciaPago,
  resolverPasarela,
  ultimos4,
  validarVencimientoTarjeta,
} from './pagos.rules.js';

// 14 de noviembre de 2026, 20:00 en El Salvador.
const ahora = new Date('2026-11-15T02:00:00Z');

describe('H2: reglas de la pasarela simulada', () => {
  it('aprueba la tarjeta terminada en 4242', () => {
    expect(resolverPasarela('4242424242424242')).toEqual({
      aprobado: true,
      motivoRechazo: null,
    });
  });

  it('rechaza la terminada en 0002 por fondos insuficientes', () => {
    expect(resolverPasarela('4000000000000002')).toEqual({
      aprobado: false,
      motivoRechazo: 'Fondos insuficientes',
    });
  });

  it('rechaza cualquier otra como no reconocida', () => {
    expect(resolverPasarela('5555555555554444').motivoRechazo).toBe(
      'Tarjeta no reconocida',
    );
  });

  it('solo conserva los últimos 4 dígitos', () => {
    expect(ultimos4('4242424242424242')).toBe('4242');
  });
});

describe('H2: referencia y vencimiento de la tarjeta', () => {
  it('arma la referencia con la fecha de El Salvador', () => {
    // 02:00 UTC del 15 todavía es el 14 en El Salvador.
    expect(referenciaPago(ahora, 14)).toBe('PAG-20261114-000014');
  });

  it('acepta una tarjeta que vence este mes o después', () => {
    expect(() => validarVencimientoTarjeta('11/26', ahora)).not.toThrow();
    expect(() => validarVencimientoTarjeta('01/27', ahora)).not.toThrow();
  });

  it('rechaza con 400 una tarjeta vencida', () => {
    expect(() => validarVencimientoTarjeta('10/26', ahora)).toThrow(
      'La tarjeta está vencida',
    );
  });
});
