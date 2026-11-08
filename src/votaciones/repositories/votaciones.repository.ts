import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@Prisma/services';

@Injectable()
export class VotacionesRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  estadoTema(temaId: string) {
    return this.prisma.temaVotacion
      .findUnique({
        where: { id: temaId },
        select: { estado: true },
      })
      .then((tema) => tema?.estado ?? null);
  }

  temasDeAsamblea(asambleaId: string) {
    return this.prisma.temaVotacion.findMany({
      where: { asambleaId },
      orderBy: { titulo: 'asc' },
      select: {
        id: true,
        titulo: true,
        estado: true,
      },
    });
  }

  async resultados(temaId: string) {
    const tema = await this.prisma.temaVotacion.findUnique({
      where: { id: temaId },
      include: {
        opciones: {
          select: {
            id: true,
            texto: true,
          },
        },
      },
    });

    if (!tema) return null;

    const [
      conteos,
      totalVotos,
      participaciones,
      unidadesHabilitadas,
    ] = await Promise.all([
      this.prisma.voto.groupBy({
        by: ['opcionId'],
        where: { temaId },
        _count: { _all: true },
      }),

      this.prisma.voto.count({
        where: { temaId },
      }),

      this.prisma.participacionVoto.findMany({
        where: { temaId },
        orderBy: { createdAt: 'asc' },
        select: {
          unidadId: true,
          createdAt: true,
          unidad: {
            select: { codigo: true },
          },
        },
      }),

      this.prisma.unidad.count({
        where: {
          activa: true,
          usuarios: {
            some: {
              user: {
                isActive: true,
                rol: 'RESIDENTE',
              },
            },
          },
        },
      }),
    ]);

    const countByOption = new Map(
      conteos.map((x) => [
        x.opcionId,
        x._count._all,
      ]),
    );

    const opciones = tema.opciones
      .map((opcion) => {
        const votos = countByOption.get(opcion.id) ?? 0;

        return {
          opcionId: opcion.id,
          texto: opcion.texto,
          votos,
          porcentaje: totalVotos
            ? Number(((votos / totalVotos) * 100).toFixed(1))
            : 0,
        };
      })
      .sort(
        (a, b) =>
          b.votos - a.votos ||
          a.texto.localeCompare(b.texto, 'es'),
      );

    return {
      temaId: tema.id,
      titulo: tema.titulo,
      opciones,
      totalVotos,
      unidadesHabilitadas,
      participacion: unidadesHabilitadas
        ? Number(
            (
              (participaciones.length / unidadesHabilitadas) *
              100
            ).toFixed(1),
          )
        : 0,
      unidadesVotantes: participaciones.map((p) => ({
        unidadId: p.unidadId,
        codigo: p.unidad.codigo,
        fecha: p.createdAt,
      })),
    };
  }

  async emitirVoto(
    userId: string,
    unidadId: string,
    temaId: string,
    opcionId: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const usuario = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            rol: true,
            isActive: true,
          },
        });

        if (
          !usuario ||
          !usuario.isActive ||
          usuario.rol !== 'RESIDENTE'
        ) {
          throw new ForbiddenException(
            'No tienes permiso para emitir votos.',
          );
        }

        const relacion = await tx.usuarioUnidad.findFirst({
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

        if (!relacion) {
          throw new ForbiddenException(
            'La unidad no está activa o no está vinculada a tu usuario.',
          );
        }

        const tema = await tx.temaVotacion.findUnique({
          where: { id: temaId },
          include: {
            asamblea: {
              select: {
                estado: true,
              },
            },
          },
        });

        if (!tema) {
          throw new NotFoundException(
            'Tema de votación inexistente.',
          );
        }

        const ahora = new Date();

        const estaAbierto =
          tema.asamblea.estado === 'PUBLICADA' &&
          ahora >= tema.apertura &&
          ahora < tema.cierre;

        if (!estaAbierto) {
          throw new ConflictException(
            'Este tema no está abierto para votar.',
          );
        }

        const opcion = await tx.opcionVoto.findFirst({
          where: {
            id: opcionId,
            temaId,
          },
          select: {
            id: true,
          },
        });

        if (!opcion) {
          throw new BadRequestException(
            'La opción seleccionada no pertenece a este tema.',
          );
        }

        // La restricción única [unidadId, temaId] evita votos duplicados.
        // Si esta inserción falla, la transacción completa se revierte.
        const participacion =
          await tx.participacionVoto.create({
            data: {
              unidadId,
              temaId,
            },
          });

        // Esta tabla NO almacena unidadId, userId ni fecha.
        await tx.voto.create({
          data: {
            temaId,
            opcionId,
          },
        });

        // Solo se devuelve la participación.
        // Nunca se devuelve la opción elegida.
        return {
          id: participacion.id,
          temaId: participacion.temaId,
          unidadId: participacion.unidadId,
          fecha: participacion.createdAt,
        };
      });
    } catch (error) {
      const prismaError = error as {
        code?: string;
      };

      if (prismaError.code === 'P2002') {
        throw new ConflictException(
          'Tu unidad ya votó en este tema.',
        );
      }

      throw error;
    }
  }

  async miEstado(
    userId: string,
    unidadId: string,
    temaId: string,
  ) {
    const relacion = await this.prisma.usuarioUnidad.findFirst({
      where: {
        userId,
        unidadId,
        unidad: {
          activa: true,
        },
        user: {
          isActive: true,
          rol: 'RESIDENTE',
        },
      },
      select: {
        id: true,
      },
    });

    if (!relacion) {
      throw new ForbiddenException(
        'La unidad no está activa o no está vinculada a tu usuario.',
      );
    }

    const tema = await this.prisma.temaVotacion.findUnique({
      where: { id: temaId },
      select: {
        id: true,
      },
    });

    if (!tema) {
      throw new NotFoundException(
        'Tema de votación inexistente.',
      );
    }

    const participacion =
      await this.prisma.participacionVoto.findUnique({
        where: {
          unidadId_temaId: {
            unidadId,
            temaId,
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

    return {
      temaId,
      unidadId,
      yaVoto: participacion !== null,
      fecha: participacion?.createdAt ?? null,
    };
  }
}
