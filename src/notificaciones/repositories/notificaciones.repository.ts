import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { EstadoNotificacion, Prisma, Rol } from '@PrismaClient';
import type { ListarNotificacionesQueryDto } from '../dto/listar-notificaciones-query.dto.js';
import { NOTIFICACION_NO_ENCONTRADA } from '../notificaciones.constants.js';
import { NotificacionDestinatarioInexistenteError } from '../services/notificaciones.errors.js';
import type {
  CrearNotificacionContenido,
  CrearNotificacionInput,
  CrearNotificacionResult,
  DestinatarioNotificacion,
} from '../services/notificaciones.types.js';
import { validarContenidoNotificacion } from '../services/crear-notificacion.validator.js';

type Db = Prisma.TransactionClient;
type DestinatarioSegmentado = Extract<
  DestinatarioNotificacion,
  { tipo: 'UNIDAD' } | { tipo: 'TORRE' } | { tipo: 'SECCION' }
>;

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

  /** Resuelve la audiencia e inserta los avisos en una sola transacción. */
  async crear(datos: CrearNotificacionInput): Promise<CrearNotificacionResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const destinatarios = await this.resolverDestinatarios(
          tx,
          datos.destinatario,
        );
        const creadas = await this.insertarAvisos(tx, datos, destinatarios);
        return { creadas };
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  /** Bloquea y revalida el tema, persiste su audiencia y marca en una transacción. */
  async crearAvisoVotacionAbierta(
    temaId: string,
    ahora: Date,
  ): Promise<CrearNotificacionResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const bloqueados = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "temas_votacion"
          WHERE "id" = ${temaId}::uuid
          FOR UPDATE
        `;
        if (bloqueados.length === 0) return { creadas: 0 };

        const tema = await tx.temaVotacion.findFirst({
          where: {
            id: temaId,
            notificadoApertura: false,
            aperturaAt: { lte: ahora },
            cierreAt: { gte: ahora },
            asamblea: { is: { estado: 'PUBLICADA' } },
          },
          select: { id: true, pregunta: true },
        });
        if (!tema) return { creadas: 0 };

        const contenido = validarContenidoNotificacion({
          tipoEvento: 'VOTACION_ABIERTA',
          moduloOrigen: 'ASAMBLEAS',
          titulo: 'Votación abierta',
          mensaje: `Ya puedes votar en «${tema.pregunta}».`,
          referenciaId: tema.id,
          claveEvento: `VOTACION_ABIERTA:${tema.id}`,
        });
        const destinatarios = await this.resolverResidentesHabilitados(tx);
        const creadas = await this.insertarAvisos(tx, contenido, destinatarios);

        const marca = await tx.temaVotacion.updateMany({
          where: { id: tema.id, notificadoApertura: false },
          data: { notificadoApertura: true },
        });
        if (marca.count !== 1) {
          throw new Error(
            `No se pudo marcar el aviso de apertura del tema ${tema.id}.`,
          );
        }

        return { creadas };
      },
      { isolationLevel: 'ReadCommitted', maxWait: 10_000, timeout: 15_000 },
    );
  }

  /**
   * Resuelve una audiencia en el mismo cliente transaccional que usará la
   * escritura del aviso. Los destinos segmentados conservan el criterio de
   * H23: la unidad vinculada no necesita estar activa.
   */
  async resolverDestinatarios(
    tx: Db,
    destinatario: DestinatarioNotificacion,
  ): Promise<string[]> {
    if (destinatario.tipo === 'TODOS') {
      return this.listarIdsResidentes(tx, filtroResidentes());
    }

    await this.exigirDestinatarioExistente(tx, destinatario);

    if (destinatario.tipo === 'USUARIO') {
      // Los disparadores directos (por ejemplo, H11) determinan la identidad.
      return [destinatario.id];
    }

    return this.listarIdsResidentes(tx, filtroResidentes(destinatario));
  }

  /** Residentes activos con al menos una unidad activa, audiencia de H20. */
  async resolverResidentesHabilitados(tx: Db): Promise<string[]> {
    return this.listarIdsResidentes(tx, {
      ...filtroResidentes(),
      unidades: { some: { unidad: { activa: true } } },
    });
  }

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

  private async exigirDestinatarioExistente(
    tx: Db,
    destinatario: Exclude<DestinatarioNotificacion, { tipo: 'TODOS' }>,
  ): Promise<void> {
    let existe: { id: string } | null;

    switch (destinatario.tipo) {
      case 'USUARIO':
        existe = await tx.user.findUnique({
          where: { id: destinatario.id },
          select: { id: true },
        });
        break;
      case 'UNIDAD':
        existe = await tx.unidad.findUnique({
          where: { id: destinatario.id },
          select: { id: true },
        });
        break;
      case 'TORRE':
        existe = await tx.torre.findUnique({
          where: { id: destinatario.id },
          select: { id: true },
        });
        break;
      case 'SECCION':
        existe = await tx.seccion.findUnique({
          where: { id: destinatario.id },
          select: { id: true },
        });
        break;
    }

    if (!existe) {
      throw new NotificacionDestinatarioInexistenteError(
        destinatario.tipo,
        destinatario.id,
      );
    }
  }

  private async listarIdsResidentes(
    tx: Db,
    where: Prisma.UserWhereInput,
  ): Promise<string[]> {
    const residentes = await tx.user.findMany({
      where,
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return residentes.map(({ id }) => id);
  }

  private async insertarAvisos(
    tx: Db,
    datos: CrearNotificacionContenido,
    destinatarios: string[],
  ): Promise<number> {
    if (destinatarios.length === 0) return 0;

    const resultado = await tx.notificacion.createMany({
      data: destinatarios.map((userId) => ({
        userId,
        moduloOrigen: datos.moduloOrigen,
        tipoEvento: datos.tipoEvento,
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        referenciaId: datos.referenciaId ?? null,
        claveEvento: datos.claveEvento,
      })),
      skipDuplicates: true,
    });

    return resultado.count;
  }
}

function filtroResidentes(
  destinatario?: DestinatarioSegmentado,
): Prisma.UserWhereInput {
  const residentes: Prisma.UserWhereInput = {
    rol: Rol.RESIDENTE,
    isActive: true,
  };

  if (!destinatario) return residentes;

  switch (destinatario.tipo) {
    case 'UNIDAD':
      return {
        ...residentes,
        unidades: { some: { unidad: { id: destinatario.id } } },
      };
    case 'TORRE':
      return {
        ...residentes,
        unidades: { some: { unidad: { torreId: destinatario.id } } },
      };
    case 'SECCION':
      return {
        ...residentes,
        unidades: { some: { unidad: { seccionId: destinatario.id } } },
      };
  }
}
