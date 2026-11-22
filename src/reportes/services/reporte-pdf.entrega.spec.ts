import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { ReportesController } from '../controllers/reportes.controller.js';
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

// H30: criterios de backend (AC3 a AC6). Los de interfaz (AC1 y AC2) están en
// components/integracion/reportes.test.tsx del frontend. Usa un doble de
// ReportesService: el PDF se arma en memoria y no se conecta a PostgreSQL.

type Fn = (...args: any[]) => any;

const ahora = new Date('2026-11-20T18:42:00-06:00');
const admin = {
  id: 'a1',
  rol: 'ADMINISTRADOR',
  nombre: 'Administración QA',
} as User;
const rango = { desde: '2026-11-01', hasta: '2026-11-20' };

// Valores observados en el despliegue el 20/11/2026 para ese período.
const resumen: ResumenIndicadores = {
  desde: rango.desde,
  hasta: rango.hasta,
  generadoAt: ahora.toISOString(),
  morosidad: {
    estado: 'DATOS',
    unidadesMorosas: 1,
    unidadesActivas: 6,
    porcentaje: 16.7,
    saldoVencido: '52.50',
  },
  usoAreas: {
    estado: 'DATOS',
    horasReservadas: 4,
    horasHabilitadas: 1600,
    porcentaje: 0.3,
  },
  incidenciasAbiertas: { estado: 'DATOS', abiertas: 4, creadas: 7 },
  participacion: {
    estado: 'DATOS',
    temasCerrados: 3,
    porcentajePromedio: 6.7,
  },
};

function fixture() {
  const reportes = {
    calcular: jest.fn<Fn>().mockResolvedValue(resumen),
    resumen: jest.fn<Fn>().mockResolvedValue(resumen),
  };
  const pdf = new ReportePdfService(reportes as unknown as ReportesService);
  const controller = new ReportesController(
    reportes as unknown as ReportesService,
    pdf,
  );
  return { reportes, pdf, controller };
}

let t: ReturnType<typeof fixture>;
beforeEach(() => {
  t = fixture();
});

describe('H30. Compartir resultados administrativos', () => {
  it('AC3: compartir entrega un PDF descargable de solo lectura, sin enlaces públicos', async () => {
    const archivo = await t.controller.descargarPdf(admin, rango);
    const headers = archivo.getHeaders();
    expect(headers.type).toBe('application/pdf');
    expect(headers.disposition).toBe(
      'attachment; filename="reporte_2026-11-01_2026-11-20.pdf"',
    );
    const { archivo: buffer, nombre } = await t.pdf.generar(
      admin,
      rango,
      ahora,
    );
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    // Solo devuelve el archivo y su nombre: no guarda nada ni crea una URL.
    expect(nombre).toBe(nombreArchivo(rango));
    expect(JSON.stringify(headers)).not.toMatch(/https?:\/\//);
  });

  it('AC4: el PDF contiene período, fecha y hora de generación y el administrador', () => {
    const c = contenidoReporte(resumen, admin.nombre);
    expect(c.periodo).toBe('01/11/2026 al 20/11/2026');
    expect(c.generado).toBe('20/11/2026 18:42 (hora de El Salvador)');
    expect(c.generadoPor).toBe('Administración QA');
  });

  it('AC4: el PDF contiene los valores y fórmulas de los indicadores de H29', () => {
    const c = contenidoReporte(resumen, admin.nombre);
    expect(c.indicadores.map((i) => [i.titulo, i.valor])).toEqual([
      ['Morosidad', '16.7 %'],
      ['Uso de áreas', '0.3 %'],
      ['Incidencias abiertas', '4'],
      ['Participación en votaciones', '6.7 %'],
    ]);
    expect(c.indicadores.map((i) => i.formula)).toEqual([
      FORMULAS.morosidad,
      FORMULAS.usoAreas,
      FORMULAS.incidencias,
      FORMULAS.participacion,
    ]);
  });

  it('AC5: los valores del PDF salen del mismo cálculo que el panel de H29', async () => {
    await t.pdf.generar(admin, rango, ahora);
    expect(t.reportes.calcular).toHaveBeenCalledWith(rango, ahora);
    const c = contenidoReporte(await t.reportes.calcular(rango, ahora), 'x');
    expect(c.indicadores[0].detalle).toBe(
      '1 de 6 unidades activas, saldo vencido $52.50',
    );
  });

  it('AC6: no permite que un Residente o un Personal de seguridad lo genere (403)', async () => {
    for (const rol of ['RESIDENTE', 'SEGURIDAD'] as const)
      await expect(
        t.pdf.generar({ id: 'u', rol } as User, rango, ahora),
      ).rejects.toThrow(ForbiddenException);
    expect(t.reportes.calcular).not.toHaveBeenCalled();
  });

  it('AC6: no permite un período inválido (400)', async () => {
    t.reportes.calcular.mockRejectedValue(
      new BadRequestException('El rango no puede superar 366 días'),
    );
    await expect(
      t.pdf.generar(admin, { desde: '2025-01-01', hasta: '2026-11-20' }, ahora),
    ).rejects.toMatchObject({ status: 400 });
  });
});
