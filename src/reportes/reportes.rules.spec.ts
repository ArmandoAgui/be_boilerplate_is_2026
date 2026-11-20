import { describe, it, expect } from 'vitest';
import { rangoReporte, horasHabilitadas, pdfTexto } from './reportes.rules.js';
import { importes } from '../cuotas/services/importes.js';
describe('Cálculos y formato aprobados por PO', () => {
  it('distingue fechas imposibles, orden y límite inclusivo de 366 días', () => {
    expect(() => rangoReporte('2026-02-30', '2026-03-01')).toThrow();
    expect(() => rangoReporte('2026-12-31', '2026-01-01')).toThrow();
    expect(() => rangoReporte('2024-01-01', '2024-12-31')).not.toThrow();
    expect(() => rangoReporte('2024-01-01', '2025-01-01')).toThrow();
  });
  it('suma franjas por día de calendario local sin depender de TZ del servidor', () => {
    expect(
      horasHabilitadas('2026-11-15', '2026-11-16', [
        {
          horarios: [
            { diaSemana: 0, horaInicio: '08:00', horaFin: '10:30' },
            { diaSemana: 1, horaInicio: '12:00', horaFin: '15:00' },
          ],
        },
      ]),
    ).toBe(5.5);
  });
  it('recargo único 5%, con redondeo monetario y sin recargo en vencimiento o anulación', () => {
    const c = {
      monto: '10.11',
      estado: 'PENDIENTE',
      fechaVencimiento: new Date('2026-11-15'),
    };
    expect(importes(c, new Date('2026-11-15T20:00:00Z')).total.toFixed(2)).toBe(
      '10.11',
    );
    expect(importes(c, new Date('2026-11-16T06:00:00Z')).total.toFixed(2)).toBe(
      '10.62',
    );
    expect(
      importes(
        { ...c, estado: 'ANULADA' },
        new Date('2026-11-16T06:00:00Z'),
      ).total.toFixed(2),
    ).toBe('10.11');
  });
  it('un pago conserva el recargo cobrado aun consultándolo después', () => {
    expect(
      importes({
        monto: '100',
        estado: 'PAGADA',
        recargoAplicado: '5',
      }).total.toFixed(2),
    ).toBe('105.00');
  });
  it('produce PDF multipágina con referencias y escapes válidos', () => {
    const pdf = pdfTexto(Array.from({ length: 90 }, () => '(Morosidad) \\ 5%'));
    expect(pdf.toString()).toContain('/Count 3');
    const xref = Number(pdf.toString().match(/startxref\n(\d+)/)?.[1]);
    expect(pdf.subarray(xref, xref + 4).toString()).toBe('xref');
    expect(pdf.toString()).toContain('\\(Morosidad\\) \\\\ 5%');
  });
});
