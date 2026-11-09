import { describe, expect, it } from 'vitest';
import { codigoPaquete, permitir } from './paquetes.rules.js';

describe('Reglas H16', () => {
  describe('codigoPaquete', () => {
    it.each([
      [1, 'PAQ-000001'],
      [42, 'PAQ-000042'],
      [999999, 'PAQ-999999'],
    ])('rellena %s a seis dígitos', (numero, esperado) =>
      expect(codigoPaquete(numero)).toBe(esperado),
    );

    it('acepta el bigint que devuelve la secuencia de Postgres', () =>
      expect(codigoPaquete(7n)).toBe('PAQ-000007'));

    // Documenta el límite: pasado el millón el código crece y el orden
    // alfabético deja de coincidir con el numérico.
    it('no recorta cuando el número supera los seis dígitos', () =>
      expect(codigoPaquete(1000000)).toBe('PAQ-1000000'));
  });

  describe('permitir', () => {
    it('deja pasar al rol incluido', () =>
      expect(() => permitir('SEGURIDAD', 'SEGURIDAD')).not.toThrow());

    it('deja pasar cuando hay varios roles', () =>
      expect(() =>
        permitir('ADMINISTRADOR', 'SEGURIDAD', 'ADMINISTRADOR'),
      ).not.toThrow());

    it('rechaza al rol que no está', () =>
      expect(() => permitir('RESIDENTE', 'SEGURIDAD')).toThrow(
        /No tienes permiso/,
      ));
  });
});
