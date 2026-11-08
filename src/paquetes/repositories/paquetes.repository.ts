import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { EstadoPaquete } from '@PrismaClient';

const camposPaquete = {
  id: true,
  codigo: true,
  empresa: true,
  descripcion: true,
  recibidoAt: true,
  estado: true,
  entregadoAt: true,
  retiraNombre: true,
};

@Injectable()
export class PaquetesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async perteneceUnidad(
    userId: string,
    unidadId: string,
  ): Promise<boolean> {
    const relacion = await this.prisma.usuarioUnidad.findFirst({
      where: {
        userId,
        unidadId,
        unidad: {
          activa: true,
        },
      },
      select: {
        id: true,
      },
    });

    return relacion !== null;
  }

  async listar(
    unidadId: string,
    estado: EstadoPaquete,
    pagina: number,
    tamanoPagina: number,
  ) {
    const where = {
      unidadId,
      estado,
    };

    const ordenamiento =
      estado === 'PENDIENTE'
        ? { recibidoAt: 'asc' as const }
        : { entregadoAt: 'desc' as const };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.paquete.findMany({
        where,
        select: camposPaquete,
        orderBy: ordenamiento,
        skip: (pagina - 1) * tamanoPagina,
        take: tamanoPagina,
      }),

      this.prisma.paquete.count({
        where,
      }),
    ]);

    return {
      datos,
      total,
      pagina,
      tamanoPagina,
    };
  }

  async detalle(id: string, userId: string) {
    return this.prisma.paquete.findFirst({
      where: {
        id,
        unidad: {
          usuarios: {
            some: {
              userId,
            },
          },
        },
      },
      select: camposPaquete,
    });
  }
}
