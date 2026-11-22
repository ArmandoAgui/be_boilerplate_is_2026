import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import type { FilaMorosidad } from '../../cuotas/services/cuotas.rules.js';
import type { MorosidadService } from '../../cuotas/services/morosidad.service.js';
import type { ReportesRepository } from '../repositories/reportes.repository.js';
import { ReportesService } from './reportes.service.js';

// H29: criterios de backend (AC3 a AC6). Los de interfaz (AC1 y AC2) están en
// components/reportes/reportes.test.tsx del frontend. Usa dobles del
// repositorio y de MorosidadService: no se conecta a PostgreSQL.

type Fn = (...args: any[]) => any;

const ahora = new Date('2026-11-22T18:00:00Z');
const admin = { id: 'a1', rol: 'ADMINISTRADOR' } as User;
const rango = { desde: '2026-11-01', hasta: '2026-11-15' };

const fila = (unidadId: string, saldoVencido: string): FilaMorosidad => ({
  unidadId,
  codigo: unidadId,
  torre: 'Torre A',
  cuotasVencidas: 1,
  saldoVencido,
  vencimientoMasAntiguo: '2026-11-10',
  diasAtraso: 12,
});

// Todos los días de 06:00 a 22:00 (16 h), como el seed.
const franjas = Array.from({ length: 7 }, (_, diaSemana) => ({
  diaSemana,
  horaInicio: '06:00',
  horaFin: '22:00',
}));

function fixture() {
  const repo = {
    unidadesActivas: jest.fn<Fn>().mockResolvedValue(8),
    cuotasVencidasEnPeriodo: jest.fn<Fn>().mockResolvedValue(8),
    horariosDeAreasActivas: jest.fn<Fn>().mockResolvedValue(franjas),
    reservasConfirmadas: jest.fn<Fn>().mockResolvedValue([]),
    incidencias: jest.fn<Fn>().mockResolvedValue({ creadas: 0, abiertas: 0 }),
    temasCerrados: jest.fn<Fn>().mockResolvedValue([]),
    unidadesHabilitadas: jest.fn<Fn>().mockResolvedValue(8),
  };
  const morosidad = { calcular: jest.fn<Fn>().mockResolvedValue([]) };
  const service = new ReportesService(
    repo as unknown as ReportesRepository,
    morosidad as unknown as MorosidadService,
  );
  return { repo, morosidad, service };
}

let t: ReturnType<typeof fixture>;
beforeEach(() => {
  t = fixture();
});

describe('H29. Consultar indicadores consolidados', () => {
  it('AC3: morosidad = unidades con cuota impaga vencida en el período ÷ unidades activas × 100, con saldo', async () => {
    t.morosidad.calcular.mockResolvedValue([
      fila('A-101', '52.50'),
      fila('B-102', '50.00'),
    ]);
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.morosidad).toEqual({
      estado: 'DATOS',
      unidadesMorosas: 2,
      unidadesActivas: 8,
      porcentaje: 25,
      saldoVencido: '102.50',
    });
  });

  it('AC3: uso de áreas = horas Confirmadas que inician en el período ÷ horas habilitadas × 100', async () => {
    // Un día con 16 h habilitadas y una reserva confirmada de 4 h = 25 %.
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

  it('AC3: incidencias abiertas = creadas en el período que no están Resueltas', async () => {
    t.repo.incidencias.mockResolvedValue({ creadas: 7, abiertas: 4 });
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.incidenciasAbiertas).toEqual({
      estado: 'DATOS',
      abiertas: 4,
      creadas: 7,
    });
  });

  it('AC3: participación = promedio por tema cerrado de unidades que votaron ÷ habilitadas × 100', async () => {
    t.repo.temasCerrados.mockResolvedValue([
      { id: 't1', _count: { participaciones: 8 } },
      { id: 't2', _count: { participaciones: 0 } },
    ]);
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.participacion).toEqual({
      estado: 'DATOS',
      temasCerrados: 2,
      porcentajePromedio: 50,
    });
  });

  it('AC4: muestra Sin datos cuando no hay registros de origen en el período', async () => {
    t.repo.cuotasVencidasEnPeriodo.mockResolvedValue(0);
    t.repo.horariosDeAreasActivas.mockResolvedValue([]);
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.morosidad).toMatchObject({
      estado: 'SIN_DATOS',
      porcentaje: null,
    });
    expect(r.usoAreas).toMatchObject({ estado: 'SIN_DATOS', porcentaje: null });
    expect(r.incidenciasAbiertas.estado).toBe('SIN_DATOS');
    expect(r.participacion).toMatchObject({
      estado: 'SIN_DATOS',
      porcentajePromedio: null,
    });
  });

  it('AC4: 5 incidencias creadas y las 5 resueltas es un 0 real, no Sin datos', async () => {
    t.repo.incidencias.mockResolvedValue({ creadas: 5, abiertas: 0 });
    const r = await t.service.resumen(admin, rango, ahora);
    expect(r.incidenciasAbiertas).toEqual({
      estado: 'DATOS',
      abiertas: 0,
      creadas: 5,
    });
    expect(r.usoAreas).toMatchObject({ estado: 'DATOS', porcentaje: 0 });
  });

  it('AC5: la morosidad sale de MorosidadService (H4) con las fechas del período', async () => {
    await t.service.resumen(admin, rango, ahora);
    expect(t.morosidad.calcular).toHaveBeenCalledWith(ahora, undefined, {
      desde: new Date('2026-11-01T00:00:00Z'),
      hasta: new Date('2026-11-15T00:00:00Z'),
    });
  });

  it('AC5: reservas e incidencias se consultan en el período en hora de El Salvador', async () => {
    await t.service.resumen(admin, rango, ahora);
    const inicio = new Date('2026-11-01T06:00:00Z');
    const fin = new Date('2026-11-16T06:00:00Z');
    expect(t.repo.reservasConfirmadas).toHaveBeenCalledWith(inicio, fin);
    expect(t.repo.incidencias).toHaveBeenCalledWith(inicio, fin);
  });

  it('AC6: no permite Desde posterior a Hasta ni un rango mayor a 366 días (400)', async () => {
    await expect(
      t.service.resumen(
        admin,
        { desde: '2026-11-16', hasta: '2026-11-15' },
        ahora,
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      t.service.resumen(
        admin,
        { desde: '2025-11-01', hasta: '2026-11-15' },
        ahora,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(t.repo.unidadesActivas).not.toHaveBeenCalled();
  });

  it('AC6: no permite que un Residente o un Personal de seguridad acceda (403)', () => {
    for (const rol of ['RESIDENTE', 'SEGURIDAD'] as const)
      expect(() =>
        t.service.resumen({ id: 'u', rol } as User, rango, ahora),
      ).toThrow(ForbiddenException);
  });
});
