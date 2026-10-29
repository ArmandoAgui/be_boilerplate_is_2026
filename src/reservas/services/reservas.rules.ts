import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Rol } from '@PrismaClient';
import type { HorarioDto } from '../dto/reservas.dto.js';

export const HORA = 3_600_000;
export const ZONA = 'America/El_Salvador';
// El Salvador usa UTC-6 sin cambios estacionales. UTC en persistencia, día local en reglas.
export function fechaLocal(fecha: Date): string {
  return new Date(fecha.getTime() - 6 * HORA).toISOString().slice(0, 10);
}
export function diaLocal(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}
export function inicioLocal(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00-06:00`);
}
export function validarFecha(fecha: string, ahora = new Date()): void {
  const d = new Date(`${fecha}T00:00:00Z`);
  const hoy = fechaLocal(ahora);
  const max = new Date(`${hoy}T00:00:00Z`);
  max.setUTCDate(max.getUTCDate() + 30);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== fecha ||
    fecha < hoy ||
    fecha > max.toISOString().slice(0, 10)
  ) {
    throw new BadRequestException(
      'Elija una fecha entre hoy y los próximos 30 días',
    );
  }
}
export function permitir(rol: Rol, ...roles: Rol[]): void {
  if (!roles.includes(rol))
    throw new ForbiddenException(
      'No tienes permiso para realizar esta operación',
    );
}
export function hayTraslape(
  inicio: Date,
  fin: Date,
  otroInicio: Date,
  otroFin: Date,
): boolean {
  return inicio < otroFin && otroInicio < fin;
}
export function validarHorarios(horarios: HorarioDto[]): void {
  if (!horarios.length)
    throw new BadRequestException('Agregue al menos una franja');
  for (const h of horarios) {
    if (
      !Number.isInteger(h.diaSemana) ||
      h.diaSemana < 0 ||
      h.diaSemana > 6 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.horaInicio) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.horaFin) ||
      h.horaFin <= h.horaInicio
    ) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la de inicio',
      );
    }
  }
  const orden = [...horarios].sort(
    (a, b) =>
      a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio),
  );
  for (let i = 1; i < orden.length; i++) {
    if (
      orden[i].diaSemana === orden[i - 1].diaSemana &&
      orden[i].horaInicio < orden[i - 1].horaFin
    )
      throw new BadRequestException('Las franjas no pueden traslaparse');
  }
}
export function dentroDeHorario(
  inicio: Date,
  fin: Date,
  horarios: HorarioDto[],
): boolean {
  const fecha = fechaLocal(inicio);
  const franjas = horarios
    .filter((h) => h.diaSemana === diaLocal(fecha))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  let cursor = inicio.getTime();
  for (const h of franjas) {
    const desde = inicioLocal(fecha, h.horaInicio).getTime();
    const hasta = inicioLocal(fecha, h.horaFin).getTime();
    if (desde <= cursor && hasta > cursor) cursor = hasta;
    if (cursor >= fin.getTime()) return true;
  }
  return false;
}
export function validarReserva(
  inicio: Date,
  duracion: number,
  asistentes: number,
  capacidad: number,
  horarios: HorarioDto[],
  ahora = new Date(),
): Date {
  if (!Number.isFinite(inicio.getTime()))
    throw new BadRequestException('Inicio inválido');
  validarFecha(fechaLocal(inicio), ahora);
  if (
    inicio < ahora ||
    inicio.getUTCMinutes() !== 0 ||
    inicio.getUTCSeconds() !== 0 ||
    inicio.getUTCMilliseconds() !== 0
  )
    throw new BadRequestException('El inicio debe ser futuro y en punto');
  if (!Number.isInteger(duracion) || duracion < 1 || duracion > 4)
    throw new BadRequestException('La duración debe ser de 1 a 4 horas');
  if (!Number.isInteger(asistentes) || asistentes < 1 || asistentes > capacidad)
    throw new BadRequestException(
      'Los asistentes deben estar entre 1 y la capacidad del área',
    );
  const fin = new Date(inicio.getTime() + duracion * HORA);
  if (!dentroDeHorario(inicio, fin, horarios))
    throw new BadRequestException('La reserva está fuera del horario del área');
  return fin;
}
