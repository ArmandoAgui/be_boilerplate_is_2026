import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma } from '@PrismaClient';
import type { ListarPaquetesDto } from '../dto/paquetes.dto.js';
import { codigoPaquete } from '../services/paquetes.rules.js';

export type SesionPaquetes = ReturnType<PaquetesRepository['sesion']>;

@Injectable()
export class PaquetesRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaccion<T>(accion: (sesion: SesionPaquetes) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => accion(this.sesion(tx)), {
      maxWait: 10_000,
      timeout: 15_000,
    });
  }

  sesion(tx: Prisma.TransactionClient = this.prisma) {
    return {
      // Inactiva cuenta como inexistente para la tarjeta: las dos dan 404.
      unidadActiva: (id: string) =>
        tx.unidad.findFirst({
          where: { id, activa: true },
          select: { id: true, codigo: true },
        }),

      /**
       * El correlativo sale de una secuencia de Postgres, no de contar filas
       * ni de leer el máximo: esas dos opciones le dan el mismo número a dos
       * registros simultáneos y el índice único rechazaría uno de los dos.
       */
      siguienteCodigo: async () => {
        const filas = await tx.$queryRaw<
          { nextval: bigint }[]
        >`SELECT nextval('paquete_codigo_seq')`;
        return codigoPaquete(filas[0].nextval);
      },

      crear: (data: Prisma.PaqueteUncheckedCreateInput) =>
        tx.paquete.create({
          data,
          include: { unidad: { select: { codigo: true } } },
        }),
    };
  }

  async listar(query: ListarPaquetesDto) {
    const where: Prisma.PaqueteWhereInput = {
      estado: query.estado,
      unidadId: query.unidadId,
    };
    const [filas, total] = await this.prisma.$transaction([
      this.prisma.paquete.findMany({
        where,
        include: { unidad: { select: { codigo: true } } },
        // El más reciente primero: es el que seguridad acaba de recibir.
        orderBy: [{ recibidoAt: 'desc' }, { id: 'desc' }],
        skip: (query.pagina - 1) * query.tamanoPagina,
        take: query.tamanoPagina,
      }),
      this.prisma.paquete.count({ where }),
    ]);
    return { filas, total };
  }
}
