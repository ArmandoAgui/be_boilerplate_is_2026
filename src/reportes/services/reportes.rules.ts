import { BadRequestException } from '@nestjs/common';

// Reglas puras de H29. No tocan la base de datos para poder probarlas solas.

export const MAX_DIAS_RANGO = 366;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
// El condominio usa UTC−6 todo el año, igual que cuotas y reservas.
const ZONA_SV = '-06:00';

export interface Rango {
  desde: string; // AAAA-MM-DD
  hasta: string; // AAAA-MM-DD
}

export type EstadoIndicador = 'DATOS' | 'SIN_DATOS';

export interface FranjaHorario {
  diaSemana: number; // 0 = domingo, igual que reservas
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM
}

/** "2026-02-30" cumple el formato pero no es una fecha real. */
function esFechaReal(fecha: string): boolean {
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/** Días de calendario del rango, contando Desde y Hasta. */
export function diasDelRango({ desde, hasta }: Rango): number {
  const ms =
    Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / MS_POR_DIA) + 1;
}

export function validarRango(rango: Rango): void {
  if (!esFechaReal(rango.desde) || !esFechaReal(rango.hasta))
    throw new BadRequestException('La fecha no existe en el calendario');
  if (rango.desde > rango.hasta)
    throw new BadRequestException('Desde no puede ser posterior a Hasta');
  if (diasDelRango(rango) > MAX_DIAS_RANGO)
    throw new BadRequestException('El rango no puede superar 366 días');
}

/**
 * Instantes [inicio, fin) que cubren el rango en hora de El Salvador:
 * desde las 00:00 de Desde hasta las 00:00 del día siguiente a Hasta.
 */
export function instantesDelRango({ desde, hasta }: Rango): {
  inicio: Date;
  fin: Date;
} {
  const inicio = new Date(`${desde}T00:00:00${ZONA_SV}`);
  const fin = new Date(
    new Date(`${hasta}T00:00:00${ZONA_SV}`).getTime() + MS_POR_DIA,
  );
  return { inicio, fin };
}

/** Fechas del rango como medianoche UTC, comparables con columnas DATE. */
export function fechasDelRango({ desde, hasta }: Rango): {
  desde: Date;
  hasta: Date;
} {
  return {
    desde: new Date(`${desde}T00:00:00Z`),
    hasta: new Date(`${hasta}T00:00:00Z`),
  };
}

/** Cuántas veces aparece cada día de la semana (0 = domingo) en el rango. */
export function diasSemanaDelRango(rango: Rango): number[] {
  const conteo = [0, 0, 0, 0, 0, 0, 0];
  // Mediodía UTC: el día de la semana no cambia por la zona horaria.
  const base = Date.parse(`${rango.desde}T12:00:00Z`);
  for (let i = 0; i < diasDelRango(rango); i++)
    conteo[new Date(base + i * MS_POR_DIA).getUTCDay()]++;
  return conteo;
}

function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Horas habilitadas: cada franja cuenta una vez por cada día suyo del rango. */
export function horasHabilitadas(
  franjas: FranjaHorario[],
  rango: Rango,
): number {
  const dias = diasSemanaDelRango(rango);
  const total = franjas.reduce(
    (suma, f) =>
      suma +
      Math.max(0, minutos(f.horaFin) - minutos(f.horaInicio)) *
        (dias[f.diaSemana] ?? 0),
    0,
  );
  return total / 60;
}

/** Horas totales de un conjunto de reservas. */
export function horasReservadas(
  reservas: { inicio: Date; fin: Date }[],
): number {
  const ms = reservas.reduce(
    (suma, r) => suma + Math.max(0, r.fin.getTime() - r.inicio.getTime()),
    0,
  );
  return ms / (60 * 60 * 1000);
}

export const redondear1 = (n: number): number => Math.round(n * 10) / 10;

/** parte ÷ total × 100 con 1 decimal. Quien llama garantiza total > 0. */
export function porcentaje(parte: number, total: number): number {
  return redondear1((parte * 100) / total);
}
