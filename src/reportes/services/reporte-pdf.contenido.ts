import type { ResumenIndicadores } from './reportes.service.js';
import type { Rango } from './reportes.rules.js';

// H30: qué dice el PDF, separado de cómo se dibuja. Así el texto se prueba
// sin abrir el archivo y los valores salen del mismo resumen de H29.

export interface SeccionIndicador {
  titulo: string;
  valor: string; // "75 %", "0" o "Sin datos"
  detalle: string;
  formula: string;
  origen: string;
}

export interface ContenidoReporte {
  titulo: string;
  periodo: string;
  generado: string;
  generadoPor: string;
  indicadores: SeccionIndicador[];
  nota: string;
}

export const FORMULAS = {
  morosidad:
    'Unidades con al menos una cuota impaga cuyo vencimiento cae en el período ÷ unidades activas × 100.',
  usoAreas:
    'Horas de reservas Confirmadas con inicio en el período ÷ horas habilitadas de las áreas activas en el período × 100.',
  incidencias:
    'Incidencias creadas en el período cuyo estado actual no es Resuelta.',
  participacion:
    'Promedio, por tema Cerrado en el período, de unidades que votaron ÷ unidades habilitadas × 100.',
} as const;

const SIN_DATOS = 'Sin datos';

/** reporte_AAAA-MM-DD_AAAA-MM-DD.pdf, como pide la historia. */
export function nombreArchivo({ desde, hasta }: Rango): string {
  return `reporte_${desde}_${hasta}.pdf`;
}

/** "2026-11-01" → "01/11/2026". */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Fecha y hora de un instante ISO en hora de El Salvador. */
export function fechaHoraLocal(iso: string): string {
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: 'America/El_Salvador',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(',', '');
}

/** Hasta 1 decimal sin ceros de relleno: 75 → "75", 33.3 → "33.3". */
export function numero(valor: number): string {
  return String(Math.round(valor * 10) / 10);
}

/** "1400.50" → "$1,400.50". */
export function dinero(monto: string): string {
  const [entero, decimales = '00'] = monto.split('.');
  const conComas = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${conComas}.${decimales.padEnd(2, '0').slice(0, 2)}`;
}

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

/** Mismos textos que las tarjetas del panel (H29) para el mismo resumen. */
export function contenidoReporte(
  r: ResumenIndicadores,
  administrador: string,
): ContenidoReporte {
  const { morosidad: m, usoAreas: u, incidenciasAbiertas: i } = r;
  const p = r.participacion;
  return {
    titulo: 'Reporte administrativo: indicadores consolidados',
    periodo: `${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}`,
    generado: `${fechaHoraLocal(r.generadoAt)} (hora de El Salvador)`,
    generadoPor: administrador,
    indicadores: [
      {
        titulo: 'Morosidad',
        valor:
          m.estado === 'DATOS' && m.porcentaje !== null
            ? `${numero(m.porcentaje)} %`
            : SIN_DATOS,
        detalle:
          m.estado === 'DATOS'
            ? `${m.unidadesMorosas} de ${plural(m.unidadesActivas, 'unidad activa', 'unidades activas')}, saldo vencido ${dinero(m.saldoVencido ?? '0.00')}`
            : m.unidadesActivas === 0
              ? 'No hay unidades activas'
              : 'Ninguna cuota venció en el período',
        formula: FORMULAS.morosidad,
        origen: 'Cuotas y pagos',
      },
      {
        titulo: 'Uso de áreas',
        valor:
          u.estado === 'DATOS' && u.porcentaje !== null
            ? `${numero(u.porcentaje)} %`
            : SIN_DATOS,
        detalle:
          u.estado === 'DATOS'
            ? `${numero(u.horasReservadas)} h reservadas de ${numero(u.horasHabilitadas)} h habilitadas`
            : 'No hay áreas activas con horario en el período',
        formula: FORMULAS.usoAreas,
        origen: 'Reservas de áreas comunes',
      },
      {
        titulo: 'Incidencias abiertas',
        valor: i.estado === 'DATOS' ? String(i.abiertas) : SIN_DATOS,
        detalle:
          i.estado === 'DATOS'
            ? `De ${plural(i.creadas, 'incidencia creada', 'incidencias creadas')} en el período`
            : 'No se crearon incidencias en el período',
        formula: FORMULAS.incidencias,
        origen: 'Incidencias',
      },
      {
        titulo: 'Participación en votaciones',
        valor:
          p.estado === 'DATOS' && p.porcentajePromedio !== null
            ? `${numero(p.porcentajePromedio)} %`
            : SIN_DATOS,
        detalle:
          p.estado === 'DATOS'
            ? `Promedio de ${plural(p.temasCerrados, 'tema cerrado', 'temas cerrados')}`
            : 'Ninguna votación cerró en el período',
        formula: FORMULAS.participacion,
        origen: 'Asambleas y votaciones',
      },
    ],
    nota:
      'Documento de solo lectura. "Sin datos" indica que no hubo registros de origen en el período; ' +
      'un 0 es un resultado real. Los valores se calcularon con los datos de cada módulo al generar el reporte.',
  };
}
