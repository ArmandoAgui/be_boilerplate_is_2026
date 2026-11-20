import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma, type EstadoCuota, type EstadoPago } from '@PrismaClient';

/** Cuota leída con bloqueo de fila; el monto viaja como texto para no perder decimales. */
export interface CuotaBloqueada {
  id: string;
  unidadId: string;
  concepto: string;
  monto: string;
  estado: EstadoCuota;
  fechaVencimiento: Date;
  recargoAplicado: string;
}

const CON_CONCEPTO = { cuota: { select: { concepto: true } } } as const;

export type PagoConConcepto = Prisma.PagoGetPayload<{
  include: typeof CON_CONCEPTO;
}>;

@Injectable()
export class PagosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El tiempo máximo cubre los 2 segundos de la pasarela con holgura; maxWait
   * deja que una solicitud simultánea espere su turno en el bloqueo de fila.
   */
  transaccion<T>(accion: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(accion, {
      maxWait: 10_000,
      timeout: 20_000,
    });
  }

  pagoPorIdempotencia(
    idempotencyKey: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<PagoConConcepto | null> {
    return tx.pago.findUnique({
      where: { idempotencyKey },
      include: CON_CONCEPTO,
    });
  }

  /**
   * SELECT … FOR UPDATE: mientras dure la transacción, ninguna otra solicitud
   * puede pagar esta misma cuota. Es lo que evita el doble cobro.
   */
  async bloquearCuota(
    cuotaId: string,
    tx: Prisma.TransactionClient,
  ): Promise<CuotaBloqueada | null> {
    const filas = await tx.$queryRaw<CuotaBloqueada[]>`
      SELECT id, "unidadId", concepto, monto::text AS monto, estado::text AS estado, "fechaVencimiento", "recargoAplicado"::text AS "recargoAplicado"
      FROM "Cuota"
      WHERE id = ${cuotaId}::uuid
      FOR UPDATE`;
    return filas[0] ?? null;
  }

  async estaVinculado(
    userId: string,
    unidadId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const vinculo = await tx.usuarioUnidad.findUnique({
      where: { userId_unidadId: { userId, unidadId } },
      select: { id: true },
    });
    return vinculo !== null;
  }

  /** Siguiente correlativo para la referencia, sin depender de contar filas. */
  async siguienteNumero(tx: Prisma.TransactionClient): Promise<number> {
    const [fila] = await tx.$queryRaw<{ n: bigint }[]>`
      SELECT nextval(pg_get_serial_sequence('"Pago"', 'numero')) AS n`;
    return Number(fila.n);
  }

  crearPago(
    data: Prisma.PagoUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<PagoConConcepto> {
    return tx.pago.create({ data, include: CON_CONCEPTO });
  }

  actualizarPago(
    id: string,
    data: { estado: EstadoPago; motivoRechazo: string | null },
    tx: Prisma.TransactionClient,
  ): Promise<PagoConConcepto> {
    return tx.pago.update({ where: { id }, data, include: CON_CONCEPTO });
  }

  marcarCuotaPagada(
    cuotaId: string,
    fechaPago: Date,
    tx: Prisma.TransactionClient,
    recargoAplicado: Prisma.Decimal = new Prisma.Decimal(0),
  ) {
    return tx.cuota.update({
      where: { id: cuotaId },
      data: { estado: 'PAGADA', fechaPago, recargoAplicado },
    });
  }

  /** Solo los pagos hechos por el usuario: un pago ajeno "no existe" (404). */
  pagoDeUsuario(id: string, userId: string): Promise<PagoConConcepto | null> {
    return this.prisma.pago.findFirst({
      where: { id, userId },
      include: CON_CONCEPTO,
    });
  }
}
