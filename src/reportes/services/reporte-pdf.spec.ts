import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import {
  FORMULAS,
  contenidoReporte,
  nombreArchivo,
} from './reporte-pdf.contenido.js';
import { ReportePdfService } from './reporte-pdf.service.js';
import type {
  ReportesService,
  ResumenIndicadores,
} from './reportes.service.js';

const ahora = new Date('2026-11-16T16:30:00Z');
const admin = { id: 'a1', rol: 'ADMINISTRADOR', nombre: 'admin' } as User;
const rango = { desde: '2026-11-01', hasta: '2026-11-16' };

const resumen: ResumenIndicadores = {
  desde: '2026-11-01',
  hasta: '2026-11-16',
  generadoAt: ahora.toISOString(),
  morosidad: {
    estado: 'DATOS',
    unidadesMorosas: 6,
    unidadesActivas: 8,
    porcentaje: 75,
    saldoVencido: '300.00',
  },
  usoAreas: {
    estado: 'DATOS',
    horasReservadas: 0,
    horasHabilitadas: 1024,
    porcentaje: 0,
  },
  incidenciasAbiertas: { estado: 'SIN_DATOS', abiertas: 0, creadas: 0 },
  participacion: {
    estado: 'SIN_DATOS',
    temasCerrados: 0,
    porcentajePromedio: null,
  },
};

function crear() {
  const reportes = { calcular: vi.fn().mockResolvedValue(resumen) };
  const service = new ReportePdfService(reportes as unknown as ReportesService);
  return { service, reportes };
}

describe('H30: contenido del reporte', () => {
  const c = contenidoReporte(resumen, 'admin');

  it('lleva período, fecha y hora de generación y quién lo generó', () => {
    expect(c.periodo).toBe('01/11/2026 al 16/11/2026');
    expect(c.generado).toBe('16/11/2026 10:30 (hora de El Salvador)');
    expect(c.generadoPor).toBe('admin');
  });

  it('usa los mismos valores que el panel de H29', () => {
    expect(c.indicadores.map((i) => [i.titulo, i.valor])).toEqual([
      ['Morosidad', '75 %'],
      ['Uso de áreas', '0 %'],
      ['Incidencias abiertas', 'Sin datos'],
      ['Participación en votaciones', 'Sin datos'],
    ]);
    expect(c.indicadores[0].detalle).toBe(
      '6 de 8 unidades activas, saldo vencido $300.00',
    );
    expect(c.indicadores[1].detalle).toBe(
      '0 h reservadas de 1024 h habilitadas',
    );
  });

  it('incluye la fórmula de cada indicador', () => {
    expect(c.indicadores.map((i) => i.formula)).toEqual([
      FORMULAS.morosidad,
      FORMULAS.usoAreas,
      FORMULAS.incidencias,
      FORMULAS.participacion,
    ]);
  });

  it('nombra el archivo reporte_AAAA-MM-DD_AAAA-MM-DD.pdf', () => {
    expect(nombreArchivo(rango)).toBe('reporte_2026-11-01_2026-11-16.pdf');
  });
});

describe('H30: descarga del PDF', () => {
  it('genera un PDF con los cálculos de H29 para el mismo período', async () => {
    const { service, reportes } = crear();
    const { archivo, nombre } = await service.generar(admin, rango, ahora);
    expect(reportes.calcular).toHaveBeenCalledWith(rango, ahora);
    expect(nombre).toBe('reporte_2026-11-01_2026-11-16.pdf');
    expect(archivo.subarray(0, 5).toString()).toBe('%PDF-');
    expect(archivo.subarray(-6).toString()).toContain('%%EOF');
  });

  it('Residente y Personal de seguridad no pueden generarlo', async () => {
    const { service, reportes } = crear();
    for (const rol of ['RESIDENTE', 'SEGURIDAD'] as const)
      await expect(
        service.generar({ id: 'u', rol } as User, rango, ahora),
      ).rejects.toThrow(ForbiddenException);
    expect(reportes.calcular).not.toHaveBeenCalled();
  });

  it('un período inválido responde 400 sin generar archivo', async () => {
    const { service, reportes } = crear();
    reportes.calcular.mockRejectedValue(
      new BadRequestException('Desde no puede ser posterior a Hasta'),
    );
    await expect(service.generar(admin, rango, ahora)).rejects.toThrow(
      'Desde no puede ser posterior a Hasta',
    );
  });
});
