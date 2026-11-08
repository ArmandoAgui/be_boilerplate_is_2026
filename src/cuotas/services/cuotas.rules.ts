import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { EstadoCuota, Prisma, Rol } from '@PrismaClient';

export const CONCEPTO_MANTENIMIENTO = 'Cuota de mantenimiento';
export const DIA_VENCIMIENTO = '10';
// El Salvador usa UTC-6 todo el año (sin horario de verano).
const DESFASE_SV_MS = 6 * 60 * 60 * 1000;

export type MotivoOmision = 'YA_EXISTE' | 'MONTO_INVALIDO';

export interface UnidadOmitida {
  unidadId: string;
  codigo: string;
  motivo: MotivoOmision;
}

/** Lanza 403 si el rol de la sesión no está entre los permitidos. */
export function soloRoles(rol: Rol, ...permitidos: Rol[]): void {
  if (!permitidos.includes(rol)) {
    throw new ForbiddenException(
      'No tienes permiso para realizar esta operación',
    );
  }
}

/** Mes calendario (AAAA-MM) según la hora de El Salvador. */
export function mesLocal(ahora: Date): string {
  return new Date(ahora.getTime() - DESFASE_SV_MS).toISOString().slice(0, 7);
}

/** Mes siguiente a un período AAAA-MM (diciembre pasa a enero del otro año). */
export function mesSiguiente(periodo: string): string {
  const anio = Number(periodo.slice(0, 4));
  const mes = Number(periodo.slice(5, 7));
  // Date.UTC cuenta los meses desde 0, así que pasar `mes` ya da el siguiente.
  return new Date(Date.UTC(anio, mes, 1)).toISOString().slice(0, 7);
}

/** H3: solo se aceptan el mes actual o el siguiente (400 en otro caso). */
export function validarPeriodo(periodo: string, ahora = new Date()): void {
  const actual = mesLocal(ahora);
  if (periodo !== actual && periodo !== mesSiguiente(actual)) {
    throw new BadRequestException('Seleccione el mes actual o el siguiente');
  }
}

/** H3: la cuota vence el día 10 del mes del período. */
export function fechaVencimiento(periodo: string): Date {
  return new Date(`${periodo}-${DIA_VENCIMIENTO}T00:00:00Z`);
}

/**
 * Separa las unidades activas en las que reciben cuota y las omitidas.
 * Es una función pura para poder probarla sin base de datos.
 */
export function clasificarUnidades<
  T extends { id: string; codigo: string; montoValido: boolean },
>(unidades: T[], conCuota: Set<string>) {
  const aGenerar: T[] = [];
  const omitidas: UnidadOmitida[] = [];
  for (const u of unidades) {
    if (conCuota.has(u.id)) {
      omitidas.push({ unidadId: u.id, codigo: u.codigo, motivo: 'YA_EXISTE' });
    } else if (!u.montoValido) {
      omitidas.push({
        unidadId: u.id,
        codigo: u.codigo,
        motivo: 'MONTO_INVALIDO',
      });
    } else {
      aGenerar.push(u);
    }
  }
  return { aGenerar, omitidas };
}

// ---------- H1: estado de cuenta ----------

/** Estado que ve el residente. VENCIDA no se guarda: se calcula al consultar. */
export type EstadoVisible = 'PENDIENTE' | 'VENCIDA' | 'PAGADA';
export const ESTADOS_VISIBLES: EstadoVisible[] = [
  'PENDIENTE',
  'VENCIDA',
  'PAGADA',
];

/** Medianoche (UTC) del día de hoy en El Salvador, comparable con columnas DATE. */
export function hoyLocal(ahora: Date): Date {
  const fecha = new Date(ahora.getTime() - DESFASE_SV_MS)
    .toISOString()
    .slice(0, 10);
  return new Date(`${fecha}T00:00:00Z`);
}

/** Una cuota PENDIENTE cuyo vencimiento ya pasó se muestra como VENCIDA. */
export function estadoVisible(
  estado: EstadoCuota,
  fechaVencimiento: Date,
  hoy: Date,
): EstadoVisible {
  if (estado === 'PAGADA') return 'PAGADA';
  return fechaVencimiento < hoy ? 'VENCIDA' : 'PENDIENTE';
}

/** Traduce el filtro de la pantalla a una condición de la base. */
export function filtroEstado(
  estado: EstadoVisible | undefined,
  hoy: Date,
): Prisma.CuotaWhereInput {
  switch (estado) {
    case 'PAGADA':
      return { estado: 'PAGADA' };
    case 'VENCIDA':
      return { estado: 'PENDIENTE', fechaVencimiento: { lt: hoy } };
    case 'PENDIENTE':
      return { estado: 'PENDIENTE', fechaVencimiento: { gte: hoy } };
    default:
      return {};
  }
}
