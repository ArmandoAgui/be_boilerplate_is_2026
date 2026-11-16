import { describe, it, expect } from 'vitest';
import {
  diasDelRango,
  diasSemanaDelRango,
  horasHabilitadas,
  horasReservadas,
  instantesDelRango,
  porcentaje,
  validarRango,
} from './reportes.rules.js';

describe('H29: rango del reporte', () => {
  it('cuenta los días incluyendo Desde y Hasta', () => {
    expect(diasDelRango({ desde: '2026-11-01', hasta: '2026-11-15' })).toBe(15);
    expect(diasDelRango({ desde: '2026-11-15', hasta: '2026-11-15' })).toBe(1);
  });

  it('acepta hasta 366 días y rechaza uno más', () => {
    expect(() =>
      validarRango({ desde: '2028-01-01', hasta: '2028-12-31' }),
    ).not.toThrow();
    expect(() =>
      validarRango({ desde: '2026-01-01', hasta: '2027-01-02' }),
    ).toThrow('El rango no puede superar 366 días');
  });

  it('rechaza Desde posterior a Hasta y fechas que no existen', () => {
    expect(() =>
      validarRango({ desde: '2026-11-16', hasta: '2026-11-15' }),
    ).toThrow('Desde no puede ser posterior a Hasta');
    expect(() =>
      validarRango({ desde: '2026-02-30', hasta: '2026-03-01' }),
    ).toThrow('La fecha no existe en el calendario');
  });

  it('convierte el rango a instantes en hora de El Salvador', () => {
    const { inicio, fin } = instantesDelRango({
      desde: '2026-11-01',
      hasta: '2026-11-15',
    });
    expect(inicio.toISOString()).toBe('2026-11-01T06:00:00.000Z');
    expect(fin.toISOString()).toBe('2026-11-16T06:00:00.000Z');
  });
});

describe('H29: horas de áreas', () => {
  it('cuenta cada día de la semana del rango', () => {
    // 2026-11-01 es domingo; 14 días = dos de cada uno.
    expect(
      diasSemanaDelRango({ desde: '2026-11-01', hasta: '2026-11-14' }),
    ).toEqual([2, 2, 2, 2, 2, 2, 2]);
  });

  it('suma las franjas por cada día que aparecen en el rango', () => {
    const franjas = [
      { diaSemana: 0, horaInicio: '06:00', horaFin: '22:00' }, // 16 h
      { diaSemana: 1, horaInicio: '08:00', horaFin: '10:30' }, // 2.5 h
    ];
    // Domingo 1 y lunes 2 de noviembre de 2026.
    expect(
      horasHabilitadas(franjas, { desde: '2026-11-01', hasta: '2026-11-02' }),
    ).toBe(18.5);
    // Solo el martes 3: ninguna franja ese día.
    expect(
      horasHabilitadas(franjas, { desde: '2026-11-03', hasta: '2026-11-03' }),
    ).toBe(0);
  });

  it('suma la duración de las reservas', () => {
    expect(
      horasReservadas([
        {
          inicio: new Date('2026-11-02T15:00:00Z'),
          fin: new Date('2026-11-02T17:30:00Z'),
        },
        {
          inicio: new Date('2026-11-03T15:00:00Z'),
          fin: new Date('2026-11-03T16:00:00Z'),
        },
      ]),
    ).toBe(3.5);
  });

  it('redondea el porcentaje a 1 decimal', () => {
    expect(porcentaje(1, 3)).toBe(33.3);
    expect(porcentaje(2, 8)).toBe(25);
  });
});
