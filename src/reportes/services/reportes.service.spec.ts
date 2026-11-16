import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import type { MorosidadService } from '../../cuotas/services/morosidad.service.js';
import type { FilaMorosidad } from '../../cuotas/services/cuotas.rules.js';
import type { ReportesRepository } from '../repositories/reportes.repository.js';
import { ReportesService } from './reportes.service.js';

const ahora = new Date('2026-11-15T18:00:00Z');
const admin = { id: 'a1', rol: 'ADMINISTRADOR' } as User;
const rango = { desde: '2026-11-01', hasta: '2026-11-15' };

const fila = (unidadId: string, saldoVencido: string): FilaMorosidad => ({
  unidadId,
  codigo: unidadId,
  torre: 'Torre A',
  cuotasVencidas: 1,
  saldoVencido,
  vencimientoMasAntiguo: '2026-11-10',
  diasAtraso: 5,
});

// Todos los días de la semana de 06:00 a 22:00 (16 h), como el seed.
const franjasSeed = Array.from({ length: 7 }, (_, diaSemana) => ({
  diaSemana,
  horaInicio: '06:00',
  horaFin: '22:00',
}));

function crear() {
  const repo = {
    unidadesActivas: vi.fn().mockResolvedValue(8),
    cuotasVencidasEnPeriodo: vi.fn().mockResolvedValue(8),
    horariosDeAreasActivas: vi.fn().mockResolvedValue(franjasSeed),
    reservasConfirmadas: vi.fn().mockResolvedValue([]),
    incidencias: vi.fn().mockResolvedValue({ creadas: 0, abiertas: 0 }),
    temasCerrados: vi.fn().mockResolvedValue([]),
    unidadesHabilitadas: vi.fn().mockResolvedValue(7),
  };
  const morosidad = { calcular: vi.fn().mockResolvedValue([]) };
  const service = new ReportesService(
    repo as unknown as ReportesRepository,
    morosidad as unknown as MorosidadService,
  );
  return { service, repo, morosidad };
}

let t: ReturnType<typeof crear>;
beforeEach(() => {
  t = crear();
});

describe('H29: permisos y rango', () => {
  it('solo el administrador consulta el panel', async () => {
    for (const rol of ['RESIDENTE', 'SEGURIDAD'] as const)
      expect(() =>
        t.service.resumen({ id: 'u', rol } as User, rango, ahora),
      ).toThrow(ForbiddenException);
  });

  it('rechaza un rango inválido antes de consultar', async () => {
    await expect(
      t.service.resumen(
        admin,
        { desde: '2026-11-16', hasta: '2026-11-15' },
        ahora,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(t.repo.unidadesActivas).not.toHaveBeenCalled();
  });

  it('devuelve el período y la hora de generación', async () => {
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r).toMatchObject({
      desde: '2026-11-01',
      hasta: '2026-11-15',
      generadoAt: '2026-11-15T18:00:00.000Z',
    });
  });
});

describe('H29: morosidad', () => {
  it('usa MorosidadService con las fechas del período y suma el saldo', async () => {
    t.morosidad.calcular.mockResolvedValue([
      fila('A-101', '100.00'),
      fila('B-102', '45.50'),
    ]);
    const r = await t.service.resumen(admin, rango, ahora);
    expect(t.morosidad.calcular).toHaveBeenCalledWith(ahora, undefined, {
      desde: new Date('2026-11-01T00:00:00Z'),
      hasta: new Date('2026-11-15T00:00:00Z'),
    });
    expect(r.morosidad).toEqual({
      estado: 'DATOS',
      unidadesMorosas: 2,
      unidadesActivas: 8,
      porcentaje: 25,
      saldoVencido: '145.50',
    });
  });

  it('un 0 real: hay cuotas vencidas en el período y todas pagadas', async () => {
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.morosidad).toMatchObject({
      estado: 'DATOS',
      porcentaje: 0,
      saldoVencido: '0.00',
    });
  });

  it('Sin datos sin cuotas vencidas en el período o sin unidades activas', async () => {
    t.repo.cuotasVencidasEnPeriodo.mockResolvedValue(0);
    let r = await t.service.resumen(admin, rango, ahora);
    expect(r.morosidad).toMatchObject({
      estado: 'SIN_DATOS',
      porcentaje: null,
      saldoVencido: null,
    });

    t = crear();
    t.repo.unidadesActivas.mockResolvedValue(0);
    r = await t.service.resumen(admin, rango, ahora);
    expect(r.morosidad.estado).toBe('SIN_DATOS');
  });
});

describe('H29: uso de áreas', () => {
  it('horas Confirmadas ÷ horas habilitadas del período', async () => {
    // 1 día × 16 h = 16 h habilitadas; 4 h reservadas = 25 %.
    t.repo.reservasConfirmadas.mockResolvedValue([
      {
        inicio: new Date('2026-11-15T15:00:00Z'),
        fin: new Date('2026-11-15T19:00:00Z'),
      },
    ]);
    const r = await t.service.resumen(
      admin,
      { desde: '2026-11-15', hasta: '2026-11-15' },
      ahora,
    );
    expect(r.usoAreas).toEqual({
      estado: 'DATOS',
      horasReservadas: 4,
      horasHabilitadas: 16,
      porcentaje: 25,
    });
  });

  it('Sin datos cuando no hay áreas activas con horario', async () => {
    t.repo.horariosDeAreasActivas.mockResolvedValue([]);
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.usoAreas).toMatchObject({ estado: 'SIN_DATOS', porcentaje: null });
  });
});

describe('H29: incidencias abiertas', () => {
  it('5 creadas y las 5 resueltas es un 0 real', async () => {
    t.repo.incidencias.mockResolvedValue({ creadas: 5, abiertas: 0 });
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.incidenciasAbiertas).toEqual({
      estado: 'DATOS',
      abiertas: 0,
      creadas: 5,
    });
  });

  it('0 creadas es Sin datos', async () => {
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.incidenciasAbiertas.estado).toBe('SIN_DATOS');
  });
});

describe('H29: participación', () => {
  it('promedia la participación de cada tema cerrado', async () => {
    // 7 habilitadas: 7/7 = 100 % y 0/7 = 0 % → 50 %.
    t.repo.temasCerrados.mockResolvedValue([
      { id: 't1', _count: { participaciones: 7 } },
      { id: 't2', _count: { participaciones: 0 } },
    ]);
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.participacion).toEqual({
      estado: 'DATOS',
      temasCerrados: 2,
      porcentajePromedio: 50,
    });
  });

  it('solo cuenta temas que ya cerraron aunque Hasta sea futuro', async () => {
    await t.service.resumen(
      admin,
      { desde: '2026-11-01', hasta: '2026-11-30' },
      ahora,
    );
    expect(t.repo.temasCerrados).toHaveBeenCalledWith(
      new Date('2026-11-01T06:00:00Z'),
      ahora,
    );
  });

  it('sin temas cerrados en el período es Sin datos', async () => {
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.participacion).toEqual({
      estado: 'SIN_DATOS',
      temasCerrados: 0,
      porcentajePromedio: null,
    });
  });
});
