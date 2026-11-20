import { Prisma } from '@PrismaClient';
import { hoyLocal } from './cuotas.rules.js';
export function tarifaMensual() {
  return new Prisma.Decimal(process.env.CUOTA_MENSUAL_USD ?? '50.00');
}
export const PORCENTAJE_RECARGO = 5;
export function importes(
  c: {
    monto: Prisma.Decimal | string;
    estado: string;
    fechaVencimiento?: Date;
    recargoAplicado?: Prisma.Decimal | string;
  },
  ahora = new Date(),
) {
  const base = new Prisma.Decimal(c.monto);
  const recargo =
    c.estado === 'PAGADA'
      ? new Prisma.Decimal(c.recargoAplicado ?? 0)
      : c.estado === 'PENDIENTE' &&
          c.fechaVencimiento &&
          c.fechaVencimiento < hoyLocal(ahora)
        ? base.mul(PORCENTAJE_RECARGO).div(100).toDecimalPlaces(2)
        : new Prisma.Decimal(0);
  return { base, recargo, total: base.add(recargo) };
}
