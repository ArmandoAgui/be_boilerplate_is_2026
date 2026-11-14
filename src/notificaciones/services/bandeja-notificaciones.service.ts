import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { EstadoNotificacion } from '@PrismaClient';
import type { NotificacionLeidaResponseDto } from '../dto/notificacion-leida-response.dto.js';
import type { NotificacionesPaginaResponseDto } from '../dto/notificaciones-pagina-response.dto.js';
import type { ListarNotificacionesQueryDto } from '../dto/listar-notificaciones-query.dto.js';
import { NotificacionesRepository } from '../repositories/notificaciones.repository.js';
import { NotificacionesActorService } from './notificaciones-actor.service.js';

/** Caso de uso de lectura; el usuario se valida antes de consultar su bandeja. */
@Injectable()
export class BandejaNotificacionesService {
  constructor(
    private readonly repository: NotificacionesRepository,
    private readonly actorService: NotificacionesActorService,
  ) {}

  async listarMias(
    userId: string,
    query: ListarNotificacionesQueryDto,
  ): Promise<NotificacionesPaginaResponseDto> {
    await this.actorService.exigirResidenteActivo(userId);

    const { filas, total, noLeidas } = await this.repository.listarMias(
      userId,
      query,
    );

    return {
      datos: filas.map((fila) => ({
        id: fila.id,
        moduloOrigen: fila.moduloOrigen,
        tipoEvento: fila.tipoEvento,
        titulo: fila.titulo,
        mensaje: fila.mensaje,
        referenciaId: fila.referenciaId,
        estado: fila.estado,
        creadaAt: fila.createdAt.toISOString(),
      })),
      noLeidas,
      total,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    };
  }

  async marcarLeida(
    userId: string,
    notificacionId: string,
  ): Promise<NotificacionLeidaResponseDto> {
    await this.actorService.exigirResidenteActivo(userId);

    const notificacion = await this.repository.marcarLeida(
      userId,
      notificacionId,
    );

    if (
      notificacion.estado !== EstadoNotificacion.LEIDA ||
      !notificacion.leidaAt
    ) {
      throw new InternalServerErrorException(
        'El aviso tiene un estado de lectura inconsistente.',
      );
    }

    return {
      id: notificacion.id,
      estado: notificacion.estado,
      leidaAt: notificacion.leidaAt.toISOString(),
    };
  }
}
