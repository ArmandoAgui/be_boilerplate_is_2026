import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { EstadoAsamblea } from '@PrismaClient';

@Injectable()
export class AsambleasRepository {
  constructor(private readonly prisma: PrismaService) {}

  crear(
    userId: string,
    data: {
      titulo: string;
      fechaHora: Date;
      descripcion?: string;
      temas: {
        titulo: string;
        apertura: Date;
        cierre: Date;
        opciones: string[];
      }[];
    },
  ) {
    return this.prisma.asamblea.create({
      data: {
        titulo: data.titulo,
        fechaHora: data.fechaHora,
        descripcion: data.descripcion,
        estado: 'BORRADOR',
        creadaPorId: userId,

        temas: {
          create: data.temas.map((tema) => ({
            titulo: tema.titulo,
            apertura: tema.apertura,
            cierre: tema.cierre,
            opciones: {
              create: tema.opciones.map((texto) => ({
                texto,
              })),
            },
          })),
        },
      },
      include: {
        temas: {
          include: {
            opciones: {
              select: {
                id: true,
                texto: true,
              },
            },
          },
        },
      },
    });
  }

  buscarPorId(id: string) {
    return this.prisma.asamblea.findUnique({
      where: { id },
      include: {
        temas: {
          include: {
            opciones: {
              select: {
                id: true,
                texto: true,
              },
            },
          },
        },
      },
    });
  }

  async publicar(id: string) {
    return this.prisma.asamblea.updateMany({
      where: {
        id,
        estado: 'BORRADOR',
      },
      data: {
        estado: 'PUBLICADA',
      },
    });
  }

  async listar(
    rol: string,
    estado: EstadoAsamblea | undefined,
    pagina: number,
    tamanoPagina: number,
  ) {
    const where = {
      ...(rol === 'RESIDENTE'
        ? { estado: 'PUBLICADA' as const }
        : estado
          ? { estado }
          : {}),
    };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.asamblea.findMany({
        where,
        orderBy: {
          fechaHora: 'desc',
        },
        skip: (pagina - 1) * tamanoPagina,
        take: tamanoPagina,
        include: {
          temas: {
            orderBy: {
              apertura: 'asc',
            },
            select: {
              id: true,
              titulo: true,
              apertura: true,
              cierre: true,
            },
          },
        },
      }),

      this.prisma.asamblea.count({ where }),
    ]);

    return {
      datos,
      total,
      pagina,
      tamanoPagina,
    };
  }

  async temasDeAsamblea(asambleaId: string) {
    return this.prisma.asamblea.findUnique({
      where: { id: asambleaId },
      select: {
        id: true,
        estado: true,
        temas: {
          orderBy: { apertura: 'asc' },
          include: {
            opciones: {
              select: {
                id: true,
                texto: true,
              },
            },
          },
        },
      },
    });
  }

  temasPendientesNotificacion(ahora: Date) {
    return this.prisma.temaVotacion.findMany({
      where: {
        apertura: { lte: ahora },
        notificadoApertura: false,
        asamblea: {
          estado: 'PUBLICADA',
        },
      },
      select: {
        id: true,
        titulo: true,
        asambleaId: true,
      },
    });
  }

  marcarNotificado(id: string) {
    return this.prisma.temaVotacion.updateMany({
      where: {
        id,
        notificadoApertura: false,
      },
      data: {
        notificadoApertura: true,
      },
    });
  }
  async reclamarNotificacion(id: string) {
  return this.prisma.temaVotacion.updateMany({
    where: {
      id,
      notificadoApertura: false,
      apertura: {
        lte: new Date(),
      },
      asamblea: {
        estado: 'PUBLICADA',
      },
    },
    data: {
      notificadoApertura: true,
    },
  });
}

async liberarNotificacion(id: string) {
  return this.prisma.temaVotacion.updateMany({
    where: {
      id,
      notificadoApertura: true,
    },
    data: {
      notificadoApertura: false,
    },
  });
}
}
