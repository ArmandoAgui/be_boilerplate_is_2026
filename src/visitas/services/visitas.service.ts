import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@PrismaClient';
import {
  VisitasRepository,
  type SesionVisitas,
} from '../repositories/visitas.repository.js';
import type {
  CrearAutorizacionDto,
  ListarAutorizacionesDto,
  PresentesDto,
  RegistrarEntradaDto,
} from '../dto/visitas.dto.js';
import {
  admiteIngreso,
  estadoVisible,
  permitir,
  validarVigencia,
} from './visitas.rules.js';

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
        throw new ForbiddenException(
          'La unidad no está vinculada a tu usuario',
        );

      const creada = await tx.crear({
        residenteId: user.id,
        unidadId: data.unidadId,
        visitanteNombre: data.visitanteNombre,
        visitanteDocumento: data.visitanteDocumento ?? '',
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
      await tx.bloquearAutorizacion(id);
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

  // -------------------------------------------------------------------------
  // H14 — Control de accesos
  // -------------------------------------------------------------------------

  async buscarAutorizaciones(user: User, buscar: string) {
    permitir(user.rol, 'SEGURIDAD');
    const filas = await this.repo.buscarUtilizables(buscar, new Date());
    return {
      datos: filas.map((a) => ({
        id: a.id,
        visitanteNombre: a.visitanteNombre,
        visitanteDocumento: a.visitanteDocumento,
        unidadCodigo: a.unidad.codigo,
        inicio: a.inicio,
        fin: a.fin,
      })),
    };
  }

  async registrarEntrada(user: User, data: RegistrarEntradaDto) {
    permitir(user.rol, 'SEGURIDAD');
    if (!data.autorizacionId)
      throw new ForbiddenException(
        'Se necesita confirmación del residente. Registra una solicitud y espera su aprobación.',
      );
    return this.repo.transaccion(async (tx) => {
      // Con autorizacionId manda la autorización y los datos del visitante
      // salen de ahí; sin él, seguridad los tecleó en la puerta.
      const movimiento = await this.entradaPreautorizada(
        tx,
        user,
        data.autorizacionId!,
      );
      return {
        id: movimiento.id,
        condicion: movimiento.condicion,
        visitanteNombre: movimiento.visitanteNombre,
        unidadCodigo: movimiento.unidad.codigo,
        ingresoAt: movimiento.ingresoAt,
      };
    });
  }

  private async entradaPreautorizada(
    tx: SesionVisitas,
    user: User,
    autorizacionId: string,
  ) {
    await tx.bloquearAutorizacion(autorizacionId);
    const autorizacion = await tx.autorizacionParaIngreso(autorizacionId);
    if (!autorizacion) throw new NotFoundException('Autorización inexistente');
    if (!admiteIngreso(autorizacion))
      throw new ConflictException(
        'La autorización no está vigente o está fuera de su ventana de tiempo',
      );
    if (await tx.presenteAutorizacion(autorizacionId))
      throw new ConflictException(
        'El visitante ya tiene una entrada sin salida',
      );
    return tx.crearMovimiento({
      autorizacionId,
      unidadId: autorizacion.unidadId,
      visitanteNombre: autorizacion.visitanteNombre,
      visitanteDocumento: autorizacion.visitanteDocumento,
      condicion: 'PREAUTORIZADA',
      ingresoPorId: user.id,
    });
  }

  async solicitar(
    user: User,
    data: {
      residenteId: string;
      unidadId: string;
      visitanteNombre: string;
      visitanteDocumento?: string;
    },
  ) {
    permitir(user.rol, 'SEGURIDAD');
    return this.repo.transaccion(async (tx) => {
      if (!(await tx.residenteUnidad(data.residenteId, data.unidadId)))
        throw new BadRequestException(
          'El residente no está activo y vinculado a la unidad',
        );
      const inicio = new Date();
      return tx.crear({
        residenteId: data.residenteId,
        unidadId: data.unidadId,
        visitanteNombre: data.visitanteNombre,
        visitanteDocumento: data.visitanteDocumento ?? '',
        inicio,
        fin: new Date(inicio.getTime() + 3600000),
        estado: 'PENDIENTE',
      });
    });
  }
  async aprobarSolicitud(user: User, id: string) {
    permitir(user.rol, 'RESIDENTE');
    return this.repo.transaccion(async (tx) => {
      await tx.bloquearAutorizacion(id);
      if (!(await tx.autorizacion(id, user.id)))
        throw new NotFoundException('Autorización inexistente');
      if ((await tx.aprobar(id, user.id)).count !== 1)
        throw new ConflictException(
          'La solicitud ya no está pendiente o venció',
        );
      return { id, estado: 'VIGENTE' };
    });
  }
  async registrarSalida(user: User, id: string) {
    permitir(user.rol, 'SEGURIDAD');
    return this.repo.transaccion(async (tx) => {
      // Primero existencia: una salida sobre algo que no existe es 404, no 409.
      const movimiento = await tx.movimiento(id);
      if (!movimiento) throw new NotFoundException('Visita inexistente');
      const ahora = new Date();
      if ((await tx.registrarSalida(id, user.id, ahora)).count !== 1)
        throw new ConflictException('La visita ya tiene una salida registrada');
      return { id, ingresoAt: movimiento.ingresoAt, salidaAt: ahora };
    });
  }

  /**
   * El endpoint lo define H15, pero la pantalla de H14 lo necesita para su
   * lista "Dentro ahora", así que se entrega acá. H15 agrega su pantalla.
   */
  async presentes(user: User, query: PresentesDto) {
    permitir(user.rol, 'SEGURIDAD', 'ADMINISTRADOR');
    const filas = await this.repo.presentes(query.buscar, query.unidadId);
    return {
      datos: filas.map((m) => ({
        id: m.id,
        visitanteNombre: m.visitanteNombre,
        visitanteDocumento: m.visitanteDocumento,
        unidadCodigo: m.unidad.codigo,
        condicion: m.condicion,
        ingresoAt: m.ingresoAt,
      })),
      total: filas.length,
    };
  }

  async unidadesActivas(user: User) {
    permitir(user.rol, 'SEGURIDAD', 'ADMINISTRADOR');
    return { datos: await this.repo.unidadesActivas() };
  }
}
