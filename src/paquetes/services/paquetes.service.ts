import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { NotificacionesService } from '../../notificaciones/services/notificaciones.service.js';
import { PaquetesRepository } from '../repositories/paquetes.repository.js';
import { permitir } from './paquetes.rules.js';
import type {
  CrearPaqueteDto,
  ListarPaquetesDto,
} from '../dto/paquetes.dto.js';

@Injectable()
export class PaquetesService {
  private readonly log = new Logger(PaquetesService.name);

  constructor(
    private readonly repo: PaquetesRepository,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async registrar(user: User, data: CrearPaqueteDto) {
    permitir(user.rol, 'SEGURIDAD');

    const paquete = await this.repo.transaccion(async (sesion) => {
      const unidad = await sesion.unidadActiva(data.unidadId);
      // La tarjeta junta inexistente e inactiva en un mismo 404: para quien
      // está en la recepción, una unidad dada de baja no existe.
      if (!unidad) throw new NotFoundException('La unidad no existe');

      return sesion.crear({
        codigo: await sesion.siguienteCodigo(),
        unidadId: data.unidadId,
        empresa: data.empresa,
        descripcion: data.descripcion || null,
        registradoPorId: user.id,
      });
    });

    // Fuera de la transacción y sin propagar el error: la tarjeta pide que el
    // paquete quede registrado aunque el aviso falle.
    try {
      await this.notificaciones.crear({
        destinatario: { tipo: 'UNIDAD', id: paquete.unidadId },
        tipoEvento: 'PAQUETE_RECIBIDO',
        moduloOrigen: 'PAQUETERIA',
        titulo: 'Llegó un paquete para tu unidad',
        mensaje: `El paquete ${paquete.codigo} está disponible en recepción.`,
        referenciaId: paquete.id,
        claveEvento: `PAQUETE_RECIBIDO:${paquete.id}`,
      });
    } catch (error) {
      this.log.error(
        `El paquete ${paquete.id} (${paquete.codigo}) quedó registrado pero falló PAQUETE_RECIBIDO`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      id: paquete.id,
      codigo: paquete.codigo,
      unidadId: paquete.unidadId,
      unidadCodigo: paquete.unidad.codigo,
      empresa: paquete.empresa,
      descripcion: paquete.descripcion,
      estado: paquete.estado,
      recibidoAt: paquete.recibidoAt,
    };
  }

  async listar(user: User, query: ListarPaquetesDto) {
    permitir(user.rol, 'SEGURIDAD', 'ADMINISTRADOR');
    const { filas, total } = await this.repo.listar(query);
    return {
      datos: filas.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        unidadCodigo: p.unidad.codigo,
        empresa: p.empresa,
        estado: p.estado,
        recibidoAt: p.recibidoAt,
      })),
      total,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    };
  }
}
