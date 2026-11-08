import { describe, expect, it } from 'vitest';
import type { EstadoAutorizacion } from '@PrismaClient';
import {
  HORA,
  admiteIngreso,
  estadoVisible,
  filtroEstado,
  filtroUtilizables,
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

describe('Reglas H14', () => {
  type Autorizacion = {
    estado: EstadoAutorizacion;
    inicio: Date;
    fin: Date;
  };
  const vigente: Autorizacion = {
    estado: 'VIGENTE',
    inicio: enHoras(-1),
    fin: enHoras(5),
  };

  describe('admiteIngreso', () => {
    it('admite una vigente dentro de su ventana', () =>
      expect(admiteIngreso(vigente, ahora)).toBe(true));

    it.each<[string, Partial<Autorizacion>]>([
      ['el inicio es exactamente ahora', { inicio: ahora }],
      ['el fin es exactamente ahora', { inicio: enHoras(-5), fin: ahora }],
    ])('admite cuando %s', (_caso, extra) =>
      expect(admiteIngreso({ ...vigente, ...extra }, ahora)).toBe(true),
    );

    it.each<[string, Partial<Autorizacion>]>([
      ['todavía no empieza', { inicio: enHoras(1), fin: enHoras(6) }],
      ['ya venció', { inicio: enHoras(-6), fin: enHoras(-1) }],
      ['está usada', { estado: 'USADA' }],
      ['está cancelada', { estado: 'CANCELADA' }],
    ])('rechaza una autorización que %s', (_caso, extra) =>
      expect(admiteIngreso({ ...vigente, ...extra }, ahora)).toBe(false),
    );
  });

  describe('filtroUtilizables', () => {
    it('exige vigente y la ventana abierta en ambos extremos', () =>
      expect(filtroUtilizables(ahora)).toEqual({
        estado: 'VIGENTE',
        inicio: { lte: ahora },
        fin: { gte: ahora },
      }));

    // El buscador y el registro de entrada son dos caminos distintos con el
    // mismo criterio. Si uno se mueve sin el otro, seguridad vería en la lista
    // autorizaciones que al registrarlas devuelven 409. Esto los amarra.
    it('coincide con admiteIngreso en todos los casos de borde', () => {
      // Se evalúa el where a mano, igual que lo haría Postgres.
      const where = filtroUtilizables(ahora) as {
        estado: 'VIGENTE';
        inicio: { lte: Date };
        fin: { gte: Date };
      };
      const cumpleFiltro = (a: Autorizacion) =>
        a.estado === where.estado &&
        a.inicio <= where.inicio.lte &&
        a.fin >= where.fin.gte;

      const casos: Autorizacion[] = [
        vigente,
        { ...vigente, inicio: ahora },
        { ...vigente, inicio: enHoras(-5), fin: ahora },
        { ...vigente, inicio: enHoras(1), fin: enHoras(6) },
        { ...vigente, inicio: enHoras(-6), fin: enHoras(-1) },
        { ...vigente, estado: 'USADA' },
        { ...vigente, estado: 'CANCELADA' },
      ];

      for (const caso of casos)
        expect(cumpleFiltro(caso)).toBe(admiteIngreso(caso, ahora));
    });
  });
});
