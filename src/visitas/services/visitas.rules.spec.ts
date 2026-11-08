import { describe, expect, it } from 'vitest';
import {
  HORA,
  estadoVisible,
  filtroEstado,
  permitir,
  validarVigencia,
} from './visitas.rules.js';

const ahora = new Date('2026-11-08T18:00:00Z');
const enHoras = (h: number) => new Date(ahora.getTime() + h * HORA);

describe('Reglas H13', () => {
  describe('validarVigencia', () => {
    it('acepta una vigencia normal dentro de la ventana', () =>
      expect(() =>
        validarVigencia(enHoras(2), enHoras(10), ahora),
      ).not.toThrow());

    it('rechaza un inicio anterior a ahora', () =>
      expect(() => validarVigencia(enHoras(-1), enHoras(5), ahora)).toThrow(
        /anterior a ahora/,
      ));

    it('rechaza un inicio a más de 30 días', () =>
      expect(() =>
        validarVigencia(enHoras(30 * 24 + 1), enHoras(30 * 24 + 5), ahora),
      ).toThrow(/30 días/));

    it.each([0, -1])('rechaza un fin que no supera al inicio (%s h)', (d) =>
      expect(() =>
        validarVigencia(enHoras(5), enHoras(5 + d), ahora),
      ).toThrow(/posterior al inicio/),
    );

    it('rechaza una vigencia de más de 24 horas', () =>
      expect(() => validarVigencia(enHoras(1), enHoras(26), ahora)).toThrow(
        /24 horas/,
      ));

    // Los dos límites son inclusivos: 24 horas exactas y el día 30 exacto son
    // válidos. Es donde se rompen las implementaciones con < en lugar de <=.
    it('acepta exactamente 24 horas de vigencia', () =>
      expect(() =>
        validarVigencia(enHoras(1), enHoras(25), ahora),
      ).not.toThrow());

    it('acepta un inicio exactamente a 30 días', () =>
      expect(() =>
        validarVigencia(enHoras(30 * 24), enHoras(30 * 24 + 2), ahora),
      ).not.toThrow());

    it('rechaza fechas inválidas', () =>
      expect(() =>
        validarVigencia(new Date('no-es-fecha'), enHoras(5), ahora),
      ).toThrow(/inválidas/));
  });

  describe('estadoVisible', () => {
    it('una vigente con fin pasado se ve como vencida', () =>
      expect(estadoVisible('VIGENTE', enHoras(-1), ahora)).toBe('VENCIDA'));

    it('una vigente con fin futuro sigue vigente', () =>
      expect(estadoVisible('VIGENTE', enHoras(1), ahora)).toBe('VIGENTE'));

    // Vencida solo aplica a las vigentes: haber sido usada o cancelada es un
    // hecho del pasado que no caduca.
    it.each(['USADA', 'CANCELADA'] as const)(
      'una %s conserva su estado aunque el fin ya pasó',
      (estado) => expect(estadoVisible(estado, enHoras(-1), ahora)).toBe(estado),
    );
  });

  describe('permitir', () => {
    it('deja pasar al rol habilitado', () =>
      expect(() => permitir('RESIDENTE', 'RESIDENTE')).not.toThrow());

    it.each(['ADMINISTRADOR', 'SEGURIDAD'] as const)(
      'bloquea a %s cuando la operación es solo de residentes',
      (rol) => expect(() => permitir(rol, 'RESIDENTE')).toThrow(/permiso/),
    );
  });

  describe('filtroEstado', () => {
    it('vigente excluye las ya vencidas', () =>
      expect(filtroEstado('VIGENTE', ahora)).toEqual({
        estado: 'VIGENTE',
        fin: { gte: ahora },
      }));

    it('vencida busca vigentes con fin pasado, no un estado almacenado', () =>
      expect(filtroEstado('VENCIDA', ahora)).toEqual({
        estado: 'VIGENTE',
        fin: { lt: ahora },
      }));

    it.each(['USADA', 'CANCELADA'] as const)(
      '%s se traduce a una igualdad directa',
      (estado) => expect(filtroEstado(estado, ahora)).toEqual({ estado }),
    );

    it('sin filtro no restringe nada', () =>
      expect(filtroEstado(undefined, ahora)).toEqual({}));
  });
});
