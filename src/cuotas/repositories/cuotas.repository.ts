import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { Prisma } from '@PrismaClient';
import { CONCEPTO_MANTENIMIENTO } from '../services/cuotas.rules.js';

/**
 * Único lugar del módulo que habla con Prisma. Cada método acepta una
 * transacción opcional para que el servicio pueda agrupar lecturas y
 * escrituras en una sola operación atómica.
 */
@Injectable()
export class CuotasRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaccion<T>(accion: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(accion);
  }

  unidadesActivas(tx: Prisma.TransactionClient = this.prisma) {
    return tx.unidad.findMany({
      where: { activa: true },
      select: { id: true, codigo: true, cuotaMensual: true },
      orderBy: { codigo: 'asc' },
    });
  }

  unidadesConCuota(
    periodo: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.cuota.findMany({
      where: { periodo, concepto: CONCEPTO_MANTENIMIENTO },
      select: { unidadId: true },
    });
  }

  /**
   * skipDuplicates respalda la restricción única (unidadId, periodo, concepto):
   * si dos administradores generan a la vez, la base no duplica cuotas.
   */
  crearCuotas(
    data: Prisma.CuotaCreateManyInput[],
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.cuota.createMany({ data, skipDuplicates: true });
  }
}
