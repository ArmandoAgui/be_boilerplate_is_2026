import { describe, it, expect } from 'vitest';
import {
  clasificarUnidades,
  fechaVencimiento,
  mesLocal,
  mesSiguiente,
  soloRoles,
  validarPeriodo,
} from './cuotas.rules.js';

// 8 de noviembre de 2026, 12:00 en El Salvador.
const ahora = new Date('2026-11-08T18:00:00Z');

describe('H3: reglas de generación de cuotas', () => {
  it('usa la hora de El Salvador para saber el mes actual', () => {
    // 1 de diciembre 03:00 UTC sigue siendo 30 de noviembre en El Salvador.
    expect(mesLocal(new Date('2026-12-01T03:00:00Z'))).toBe('2026-11');
    expect(mesLocal(new Date('2026-12-01T06:00:00Z'))).toBe('2026-12');
  });

  it('calcula el mes siguiente, incluido el cambio de año', () => {
    expect(mesSiguiente('2026-11')).toBe('2026-12');
    expect(mesSiguiente('2026-12')).toBe('2027-01');
  });

  it('acepta el mes actual y el siguiente', () => {
    expect(() => validarPeriodo('2026-11', ahora)).not.toThrow();
    expect(() => validarPeriodo('2026-12', ahora)).not.toThrow();
  });

  it('rechaza con 400 un período fuera de rango', () => {
    for (const periodo of ['2026-10', '2027-01', '2025-11']) {
      expect(() => validarPeriodo(periodo, ahora)).toThrow(
        'Seleccione el mes actual o el siguiente',
      );
    }
  });

  it('vence el día 10 del mes del período', () => {
    expect(fechaVencimiento('2026-12').toISOString()).toBe(
      '2026-12-10T00:00:00.000Z',
    );
  });

  it('omite unidades que ya tienen cuota o con monto inválido', () => {
    const { aGenerar, omitidas } = clasificarUnidades(
      [
        { id: 'u1', codigo: 'A-101', montoValido: true },
        { id: 'u2', codigo: 'A-102', montoValido: true },
        { id: 'u3', codigo: 'B-101', montoValido: false },
      ],
      new Set(['u2']),
    );
    expect(aGenerar.map((u) => u.codigo)).toEqual(['A-101']);
    expect(omitidas).toEqual([
      { unidadId: 'u2', codigo: 'A-102', motivo: 'YA_EXISTE' },
      { unidadId: 'u3', codigo: 'B-101', motivo: 'MONTO_INVALIDO' },
    ]);
  });

  it('solo permite generar cuotas al Administrador (403)', () => {
    expect(() => soloRoles('ADMINISTRADOR', 'ADMINISTRADOR')).not.toThrow();
    expect(() => soloRoles('RESIDENTE', 'ADMINISTRADOR')).toThrow(
      'No tienes permiso',
    );
    expect(() => soloRoles('SEGURIDAD', 'ADMINISTRADOR')).toThrow(
      'No tienes permiso',
    );
  });
});
