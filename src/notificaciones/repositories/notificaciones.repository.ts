import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { EstadoNotificacion, Prisma } from '@PrismaClient';
import type { ListarNotificacionesQueryDto } from '../dto/listar-notificaciones-query.dto.js';
import { NOTIFICACION_NO_ENCONTRADA } from '../notificaciones.constants.js';

const NOTIFICACION_BANDEJA_SELECT = {
  id: true,
  moduloOrigen: true,
  tipoEvento: true,
  titulo: true,
  mensaje: true,
  referenciaId: true,
  estado: true,
  createdAt: true,
} satisfies Prisma.NotificacionSelect;

const NOTIFICACION_LEIDA_SELECT = {
  id: true,
  estado: true,
  leidaAt: true,
} satisfies Prisma.NotificacionSelect;

export type NotificacionBandejaRecord = Prisma.NotificacionGetPayload<{
  select: typeof NOTIFICACION_BANDEJA_SELECT;
}>;

export type NotificacionLeidaRecord = Prisma.NotificacionGetPayload<{
  select: typeof NOTIFICACION_LEIDA_SELECT;
}>;

export interface NotificacionesBandejaResult {
  filas: NotificacionBandejaRecord[];
  total: number;
  noLeidas: number;
}

/** Consultas propias de la bandeja; toda lectura queda acotada por userId. */
@Injectable()
export class NotificacionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarMias(
    userId: string,
    query: ListarNotificacionesQueryDto,
  ): Promise<NotificacionesBandejaResult> {
    const where: Prisma.NotificacionWhereInput = {
      userId,
      ...(query.moduloOrigen !== undefined
        ? { moduloOrigen: query.moduloOrigen }
        : {}),
      ...(query.estado !== undefined ? { estado: query.estado } : {}),
    };
    const whereNoLeidas: Prisma.NotificacionWhereInput = {
      userId,
      estado: EstadoNotificacion.NO_LEIDA,
    };
    const skip = (query.pagina - 1) * query.tamanoPagina;

    return this.prisma.$transaction(
      async (tx) => {
        const filas = await tx.notificacion.findMany({
          where,
          select: NOTIFICACION_BANDEJA_SELECT,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip,
          take: query.tamanoPagina,
        });
        const total = await tx.notificacion.count({ where });
        const noLeidas = await tx.notificacion.count({ where: whereNoLeidas });

        this.exigirConteoSeguro(total, 'total');
        this.exigirConteoSeguro(noLeidas, 'noLeidas');

        return { filas, total, noLeidas };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async marcarLeida(
    userId: string,
    notificacionId: string,
  ): Promise<NotificacionLeidaRecord> {
    return this.prisma.$transaction(
      async (tx) => {
        const actualizacion = await tx.notificacion.updateMany({
          where: {
            id: notificacionId,
            userId,
            estado: EstadoNotificacion.NO_LEIDA,
          },
          data: {
            estado: EstadoNotificacion.LEIDA,
            leidaAt: new Date(),
          },
        });

        const notificacion = await tx.notificacion.findFirst({
          where: { id: notificacionId, userId },
          select: NOTIFICACION_LEIDA_SELECT,
        });

        if (!notificacion) {
          throw new NotFoundException(NOTIFICACION_NO_ENCONTRADA);
        }

        if (
          actualizacion.count === 0 &&
          notificacion.estado !== EstadoNotificacion.LEIDA
        ) {
          throw new InternalServerErrorException(
            'No se pudo confirmar el estado de lectura del aviso.',
          );
        }

        return notificacion;
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  private exigirConteoSeguro(conteo: number, nombre: string): void {
    if (!Number.isSafeInteger(conteo) || conteo < 0) {
      throw new Error(`El conteo ${nombre} excede el entero seguro.`);
    }
  }
}
