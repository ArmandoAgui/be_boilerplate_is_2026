import { describe, it, expect } from 'vitest';
import {
  fechaLocal,
  validarFecha,
  hayTraslape,
  validarHorarios,
  validarReserva,
  dentroDeHorario,
  permitir,
} from './reservas.rules.js';
const ahora = new Date('2026-10-29T18:00:00Z');
const horarios = Array.from({ length: 7 }, (_, diaSemana) => ({
  diaSemana,
  horaInicio: '06:00',
  horaFin: '22:00',
}));
describe('Reglas H5–H8', () => {
  it('calcula el día local incluso antes de 06 UTC', () =>
    expect(fechaLocal(new Date('2026-10-30T03:00:00Z'))).toBe('2026-10-29'));
  it.each(['2026-10-28', '2026-11-29', '2026-02-30', 'ayer', '2026-13-01'])(
    'rechaza fecha inválida %s',
    (fecha) => expect(() => validarFecha(fecha, ahora)).toThrow(),
  );
  it('incluye hoy y día 30', () => {
    expect(() => validarFecha('2026-10-29', ahora)).not.toThrow();
    expect(() => validarFecha('2026-11-28', ahora)).not.toThrow();
  });
  it('los intervalos colindantes no se traslapan', () =>
    expect(
      hayTraslape(new Date(0), new Date(10), new Date(10), new Date(20)),
    ).toBe(false));
  it('detecta intervalos contenidos y cruces parciales', () => {
    expect(
      hayTraslape(new Date(0), new Date(30), new Date(10), new Date(20)),
    ).toBe(true);
    expect(
      hayTraslape(new Date(0), new Date(15), new Date(10), new Date(20)),
    ).toBe(true);
  });
  it.each([0, 5, 1.5])('rechaza duración %s', (d) =>
    expect(() =>
      validarReserva(
        new Date('2026-10-30T18:00:00Z'),
        d,
        2,
        40,
        horarios,
        ahora,
      ),
    ).toThrow(),
  );
  it.each([0, 41, 1.2])('rechaza asistentes %s', (n) =>
    expect(() =>
      validarReserva(
        new Date('2026-10-30T18:00:00Z'),
        1,
        n,
        40,
        horarios,
        ahora,
      ),
    ).toThrow(),
  );
  it.each([
    '2026-10-30T18:30:00Z',
    '2026-10-29T17:00:00Z',
    '2026-10-30T18:00:01Z',
    '2026-10-30T18:00:00.001Z',
  ])('rechaza inicio %s', (f) =>
    expect(() =>
      validarReserva(new Date(f), 1, 2, 40, horarios, ahora),
    ).toThrow(),
  );
  it('rechaza fuera del horario', () =>
    expect(() =>
      validarReserva(
        new Date('2026-10-30T03:00:00Z'),
        4,
        2,
        40,
        horarios,
        ahora,
      ),
    ).toThrow());
  it('convierte duración correctamente', () =>
    expect(
      validarReserva(
        new Date('2026-10-30T18:00:00Z'),
        4,
        2,
        40,
        horarios,
        ahora,
      ).toISOString(),
    ).toBe('2026-10-30T22:00:00.000Z'));
  it('acepta franjas colindantes como una ventana continua', () =>
    expect(
      dentroDeHorario(
        new Date('2026-10-30T18:00Z'),
        new Date('2026-10-30T20:00Z'),
        [
          { diaSemana: 5, horaInicio: '12:00', horaFin: '13:00' },
          { diaSemana: 5, horaInicio: '13:00', horaFin: '14:00' },
        ],
      ),
    ).toBe(true));
  it('rechaza franjas sin cobertura completa', () =>
    expect(
      dentroDeHorario(
        new Date('2026-10-30T18:00Z'),
        new Date('2026-10-30T20:00Z'),
        [
          { diaSemana: 5, horaInicio: '12:00', horaFin: '13:00' },
          { diaSemana: 5, horaInicio: '13:30', horaFin: '14:00' },
        ],
      ),
    ).toBe(false));
  it('valida franjas y solapamientos', () => {
    expect(() => validarHorarios([])).toThrow();
    expect(() =>
      validarHorarios([
        { diaSemana: 1, horaInicio: '12:00', horaFin: '12:00' },
      ]),
    ).toThrow();
    expect(() =>
      validarHorarios([
        { diaSemana: 1, horaInicio: '12:00', horaFin: '14:00' },
        { diaSemana: 1, horaInicio: '13:00', horaFin: '15:00' },
      ]),
    ).toThrow();
    expect(() =>
      validarHorarios([
        { diaSemana: 1, horaInicio: '12:00', horaFin: '14:00' },
        { diaSemana: 1, horaInicio: '14:00', horaFin: '15:00' },
      ]),
    ).not.toThrow();
  });
  it('rechaza roles no autorizados', () =>
    expect(() =>
      permitir('SEGURIDAD', 'RESIDENTE', 'ADMINISTRADOR'),
    ).toThrow());
});
