import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { EstadoAutorizacion, Prisma, Rol } from '@PrismaClient';
import type { EstadoAutorizacionFiltro } from '../dto/visitas.dto.js';

export const HORA = 3_600_000;
export const VIGENCIA_MAXIMA_MS = 24 * HORA;
export const ANTICIPACION_MAXIMA_MS = 30 * 24 * HORA;

// Duplica el helper de reservas a propósito: los módulos de cada integrante no
// dependen entre sí. Candidato a mover a @Common cuando haya un tercero.
export function permitir(rol: Rol, ...roles: Rol[]): void {
  if (!roles.includes(rol))
    throw new ForbiddenException(
      'No tienes permiso para realizar esta operación',
    );
}

/**
 * H13 tiene dos redacciones del límite inferior: el criterio de aceptación dice
 * "no anterior a hoy" y la tabla técnica "entre ahora y 30 días". KAN-10 lo
 * resuelve por especificidad a favor de la segunda, así que una vigencia que
 * arrancó hace una hora se rechaza aunque siga siendo el día de hoy.
 */
export function validarVigencia(
  inicio: Date,
  fin: Date,
  ahora = new Date(),
): void {
  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()))
    throw new BadRequestException('Las fechas de vigencia son inválidas');
  if (inicio < ahora)
    throw new BadRequestException('El inicio no puede ser anterior a ahora');
  if (inicio.getTime() > ahora.getTime() + ANTICIPACION_MAXIMA_MS)
    throw new BadRequestException(
      'El inicio no puede superar los 30 días a futuro',
    );
  if (fin <= inicio)
    throw new BadRequestException('El fin debe ser posterior al inicio');
  if (fin.getTime() - inicio.getTime() > VIGENCIA_MAXIMA_MS)
    throw new BadRequestException('La vigencia máxima es de 24 horas');
}

/** Solo una vigente vence. Una usada o cancelada conserva su estado para siempre. */
export function estadoVisible(
  estado: EstadoAutorizacion,
  fin: Date,
  ahora = new Date(),
): EstadoAutorizacionFiltro {
  return estado === 'VIGENTE' && fin < ahora ? 'VENCIDA' : estado;
}

/**
 * Traduce el filtro de la pantalla a un `where` de Prisma. Vigente y Vencida
 * comparten el mismo estado almacenado y se separan por `fin`, así que el
 * filtro no puede ser una igualdad directa sobre la columna.
 */
export function filtroEstado(
  estado: EstadoAutorizacionFiltro | undefined,
  ahora: Date,
): Prisma.AutorizacionVisitaWhereInput {
  if (estado === 'VIGENTE') return { estado: 'VIGENTE', fin: { gte: ahora } };
  if (estado === 'VENCIDA') return { estado: 'VIGENTE', fin: { lt: ahora } };
  if (estado) return { estado };
  return {};
}
