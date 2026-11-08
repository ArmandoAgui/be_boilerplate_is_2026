import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@PrismaClient';
import { VisitasRepository } from '../repositories/visitas.repository.js';
import type {
  CrearAutorizacionDto,
  ListarAutorizacionesDto,
} from '../dto/visitas.dto.js';
import { estadoVisible, permitir, validarVigencia } from './visitas.rules.js';

@Injectable()
export class VisitasService {
  constructor(private readonly repo: VisitasRepository) {}

  async crear(user: User, data: CrearAutorizacionDto) {
    permitir(user.rol, 'RESIDENTE');
    const inicio = new Date(data.inicio);
    const fin = new Date(data.fin);
    validarVigencia(inicio, fin);

    return this.repo.transaccion(async (tx) => {
      // Unidad inexistente y unidad ajena son casos distintos: 404 y 403.
      if (!(await tx.unidad(data.unidadId)))
        throw new NotFoundException('Unidad inexistente');
      if (!(await tx.vinculo(user.id, data.unidadId)))
        throw new ForbiddenException('La unidad no está vinculada a tu usuario');

      const creada = await tx.crear({
        residenteId: user.id,
        unidadId: data.unidadId,
        visitanteNombre: data.visitanteNombre,
        visitanteDocumento: data.visitanteDocumento,
        inicio,
        fin,
      });
      return {
        id: creada.id,
        unidadId: creada.unidadId,
        visitanteNombre: creada.visitanteNombre,
        visitanteDocumento: creada.visitanteDocumento,
        inicio: creada.inicio,
        fin: creada.fin,
        estado: creada.estado,
      };
    });
  }

  async mias(user: User, query: ListarAutorizacionesDto) {
    permitir(user.rol, 'RESIDENTE');
    const ahora = new Date();
    const { filas, total } = await this.repo.mias(user.id, query, ahora);
    return {
      datos: filas.map((a) => ({
        id: a.id,
        visitanteNombre: a.visitanteNombre,
        unidadCodigo: a.unidad.codigo,
        inicio: a.inicio,
        fin: a.fin,
        estado: estadoVisible(a.estado, a.fin, ahora),
      })),
      total,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    };
  }

  async cancelar(user: User, id: string) {
    permitir(user.rol, 'RESIDENTE');
    return this.repo.transaccion(async (tx) => {
      // Primero existencia y propiedad, para no responder 409 por algo que el
      // residente ni siquiera puede ver.
      if (!(await tx.autorizacion(id, user.id)))
        throw new NotFoundException('Autorización inexistente');
      const ahora = new Date();
      if ((await tx.cancelar(id, user.id, ahora)).count !== 1)
        throw new ConflictException(
          'Solo se puede cancelar una autorización vigente',
        );
      return { id, estado: 'CANCELADA' as const, canceladaAt: ahora };
    });
  }
}
