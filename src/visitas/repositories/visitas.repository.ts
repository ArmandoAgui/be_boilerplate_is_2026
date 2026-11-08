import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma } from '@PrismaClient';
import type { ListarAutorizacionesDto } from '../dto/visitas.dto.js';
import { filtroEstado } from '../services/visitas.rules.js';

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
}
