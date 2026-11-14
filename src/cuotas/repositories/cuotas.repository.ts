import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { Prisma } from '@PrismaClient';
import { CONCEPTO_MANTENIMIENTO } from '../services/cuotas.rules.js';

export const CUOTAS_POR_VENCER_TAMANO_LOTE = 100;

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

  // ---------- H1: estado de cuenta ----------

  unidadExiste(unidadId: string) {
    return this.prisma.unidad.findUnique({
      where: { id: unidadId },
      select: { id: true },
    });
  }

  async estaVinculado(userId: string, unidadId: string) {
    const vinculo = await this.prisma.usuarioUnidad.findUnique({
      where: { userId_unidadId: { userId, unidadId } },
      select: { id: true },
    });
    return vinculo !== null;
  }

  /**
   * Página de cuotas, total de filas y saldo pendiente de la unidad.
   * Las tres consultas van en una transacción para que las cifras coincidan.
   */
  async listar(
    where: Prisma.CuotaWhereInput,
    unidadId: string,
    skip: number,
    take: number,
  ) {
    const [filas, total, suma] = await this.prisma.$transaction([
      this.prisma.cuota.findMany({
        where,
        orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.cuota.count({ where }),
      // El total pendiente incluye las vencidas: en la base ambas son PENDIENTE.
      this.prisma.cuota.aggregate({
        where: { unidadId, estado: 'PENDIENTE' },
        _sum: { monto: true },
      }),
    ]);
    return { filas, total, pendiente: suma._sum.monto };
  }

  /** Busca la cuota solo entre las unidades del usuario: si no es suya, no existe. */
  cuotaDeUsuario(id: string, userId: string) {
    return this.prisma.cuota.findFirst({
      where: { id, unidad: { usuarios: { some: { userId } } } },
    });
  }

  // ---------- H4: morosidad ----------

  /** Cuotas vencidas agrupadas por unidad: cantidad, saldo y vencimiento más antiguo. */
  morosidadPorUnidad(vencidas: Prisma.CuotaWhereInput, torreId?: string) {
    return this.prisma.cuota.groupBy({
      by: ['unidadId'],
      where: { ...vencidas, ...(torreId ? { unidad: { torreId } } : {}) },
      _count: { _all: true },
      _sum: { monto: true },
      _min: { fechaVencimiento: true },
    });
  }

  unidadesConTorre(ids: string[]) {
    return this.prisma.unidad.findMany({
      where: { id: { in: ids } },
      select: { id: true, codigo: true, torre: { select: { nombre: true } } },
    });
  }

  unidadConTorre(id: string) {
    return this.prisma.unidad.findUnique({
      where: { id },
      select: { id: true, codigo: true, torre: { select: { nombre: true } } },
    });
  }

  cuotasDeUnidad(unidadId: string, filtro: Prisma.CuotaWhereInput) {
    return this.prisma.cuota.findMany({
      where: { unidadId, ...filtro },
      orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }],
    });
  }

  /** Lote de cuotas pendientes para el día exacto, paginado por ID estable. */
  cuotasPendientesPorVencer(fecha: Date, despuesDeId?: string) {
    return this.prisma.cuota.findMany({
      where: {
        estado: 'PENDIENTE',
        fechaVencimiento: fecha,
        ...(despuesDeId ? { id: { gt: despuesDeId } } : {}),
      },
      select: { id: true, unidadId: true, fechaVencimiento: true },
      orderBy: { id: 'asc' },
      take: CUOTAS_POR_VENCER_TAMANO_LOTE,
    });
  }
}
