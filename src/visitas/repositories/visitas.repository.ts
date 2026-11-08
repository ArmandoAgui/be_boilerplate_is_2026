import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma } from '@PrismaClient';
import type { ListarAutorizacionesDto } from '../dto/visitas.dto.js';
import { filtroEstado, filtroUtilizables } from '../services/visitas.rules.js';

export type SesionVisitas = ReturnType<VisitasRepository['sesion']>;

@Injectable()
export class VisitasRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaccion<T>(accion: (sesion: SesionVisitas) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => accion(this.sesion(tx)), {
      maxWait: 10_000,
      timeout: 15_000,
    });
  }

  sesion(tx: Prisma.TransactionClient = this.prisma) {
    return {
      unidad: (id: string) =>
        tx.unidad.findUnique({ where: { id }, select: { id: true } }),
      // La pertenencia sale de UsuarioUnidad con el usuario de la sesión; el
      // unidadId del cliente solo sirve para preguntar, nunca para autorizar.
      vinculo: (userId: string, unidadId: string) =>
        tx.usuarioUnidad.findUnique({
          where: { userId_unidadId: { userId, unidadId } },
          select: { id: true },
        }),
      crear: (data: Prisma.AutorizacionVisitaUncheckedCreateInput) =>
        tx.autorizacionVisita.create({ data }),
      autorizacion: (id: string, residenteId: string) =>
        tx.autorizacionVisita.findFirst({
          where: { id, residenteId },
          select: { id: true },
        }),
      // Actualización condicional: con dos cancelaciones simultáneas de la
      // misma autorización, solo una devuelve count 1.
      cancelar: (id: string, residenteId: string, ahora: Date) =>
        tx.autorizacionVisita.updateMany({
          where: { id, residenteId, estado: 'VIGENTE' },
          data: { estado: 'CANCELADA', canceladaAt: ahora },
        }),

      // ---- H14 ----
      autorizacionParaIngreso: (id: string) =>
        tx.autorizacionVisita.findUnique({
          where: { id },
          select: {
            id: true,
            estado: true,
            inicio: true,
            fin: true,
            unidadId: true,
            visitanteNombre: true,
            visitanteDocumento: true,
          },
        }),
      // Si dos guardias registran la misma autorización a la vez, solo uno
      // obtiene count 1 y el otro recibe el 409.
      marcarUsada: (id: string) =>
        tx.autorizacionVisita.updateMany({
          where: { id, estado: 'VIGENTE' },
          data: { estado: 'USADA' },
        }),
      crearMovimiento: (data: Prisma.MovimientoVisitaUncheckedCreateInput) =>
        tx.movimientoVisita.create({
          data,
          include: { unidad: { select: { codigo: true } } },
        }),
      movimiento: (id: string) =>
        tx.movimientoVisita.findUnique({
          where: { id },
          select: { id: true, ingresoAt: true },
        }),
      // WHERE salidaAt IS NULL: con dos salidas simultáneas solo una cuenta.
      registrarSalida: (id: string, salidaPorId: string, ahora: Date) =>
        tx.movimientoVisita.updateMany({
          where: { id, salidaAt: null },
          data: { salidaAt: ahora, salidaPorId },
        }),
    };
  }

  async mias(
    residenteId: string,
    query: ListarAutorizacionesDto,
    ahora: Date,
  ) {
    const where: Prisma.AutorizacionVisitaWhereInput = {
      residenteId,
      ...filtroEstado(query.estado, ahora),
    };
    const [filas, total] = await this.prisma.$transaction(
      [
        this.prisma.autorizacionVisita.findMany({
          where,
          include: { unidad: { select: { codigo: true } } },
          // La card no fija el orden. Se usa el más reciente primero, como el
          // resto de las pantallas "mis ...", con el id de desempate para que
          // la paginación sea estable.
          orderBy: [{ inicio: 'desc' }, { id: 'asc' }],
          skip: (query.pagina - 1) * query.tamanoPagina,
          take: query.tamanoPagina,
        }),
        this.prisma.autorizacionVisita.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { filas, total };
  }

  /** Lo que seguridad puede usar en la puerta ahora mismo (H14). */
  buscarUtilizables(buscar: string, ahora: Date) {
    return this.prisma.autorizacionVisita.findMany({
      where: {
        ...filtroUtilizables(ahora),
        OR: [
          { visitanteNombre: { contains: buscar, mode: 'insensitive' } },
          { visitanteDocumento: { contains: buscar, mode: 'insensitive' } },
        ],
      },
      include: { unidad: { select: { codigo: true } } },
      orderBy: [{ fin: 'asc' }, { id: 'asc' }],
      take: 50,
    });
  }

  /** Quién está dentro: movimiento con ingreso y sin salida. */
  presentes(buscar: string | undefined, unidadId: string | undefined) {
    return this.prisma.movimientoVisita.findMany({
      where: {
        salidaAt: null,
        unidadId,
        ...(buscar
          ? {
              OR: [
                { visitanteNombre: { contains: buscar, mode: 'insensitive' } },
                {
                  visitanteDocumento: {
                    contains: buscar,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      include: { unidad: { select: { codigo: true } } },
      // El de más tiempo adentro primero, que es el que seguridad vigila.
      orderBy: [{ ingresoAt: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Catálogo para el desplegable de "Visita sin autorización". Seguridad no
   * vive en ninguna unidad, así que no sirve el `/unidades/mias` de reservas:
   * necesita todas las activas.
   */
  unidadesActivas() {
    return this.prisma.unidad.findMany({
      where: { activa: true },
      select: { id: true, codigo: true },
      orderBy: { codigo: 'asc' },
    });
  }
}
