import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma } from '@PrismaClient';
import type {
  CrearAreaDto,
  EditarAreaDto,
  ListarReservasDto,
} from '../dto/reservas.dto.js';

export type SesionReservas = ReturnType<ReservasRepository['sesion']>;
const includeArea = {
  horarios: {
    orderBy: [{ diaSemana: 'asc' as const }, { horaInicio: 'asc' as const }],
  },
};
@Injectable()
export class ReservasRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaccion<T>(accion: (sesion: SesionReservas) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => accion(this.sesion(tx)), {
      maxWait: 10_000,
      timeout: 15_000,
    });
  }
  sesion(tx: Prisma.TransactionClient = this.prisma) {
    return {
      // Reservas personales: primero usuario, luego área. Todas las consultas críticas usan tx.
      bloquearUsuario: (id: string) =>
        tx.$queryRaw`SELECT id FROM "users" WHERE id = ${id}::uuid FOR UPDATE`,
      bloquearArea: (id: string) =>
        tx.$queryRaw`SELECT id FROM "AreaComun" WHERE id = ${id}::uuid FOR UPDATE`,
      area: (id: string) =>
        tx.areaComun.findUnique({ where: { id }, include: includeArea }),
      futuras: (userId: string, ahora: Date) =>
        tx.reserva.count({
          where: { userId, estado: 'CONFIRMADA', inicio: { gt: ahora } },
        }),
      ocupadas: (areaId: string, inicio: Date, fin: Date) =>
        tx.reserva.findMany({
          where: {
            areaId,
            estado: 'CONFIRMADA',
            inicio: { lt: fin },
            fin: { gt: inicio },
          },
        }),
      crear: (data: Prisma.ReservaUncheckedCreateInput) =>
        tx.reserva.create({ data }),
      reserva: (id: string, userId: string) =>
        tx.reserva.findFirst({
          where: {
            id,
            userId,
          },
        }),
      cancelar: (id: string, userId: string, ahora: Date) =>
        tx.reserva.updateMany({
          where: {
            id,
            userId,
            estado: 'CONFIRMADA',
            inicio: { gte: new Date(ahora.getTime() + 7_200_000) },
          },
          data: { estado: 'CANCELADA', canceladaAt: ahora },
        }),
      crearArea: (data: CrearAreaDto) =>
        tx.areaComun.create({
          data: {
            nombre: data.nombre,
            capacidad: data.capacidad,
            activa: data.activa,
            horarios: { create: data.horarios },
          },
          include: includeArea,
        }),
      editarArea: async (id: string, data: EditarAreaDto) => {
        if (data.horarios !== undefined)
          await tx.horarioArea.deleteMany({ where: { areaId: id } });
        return tx.areaComun.update({
          where: { id },
          data: {
            nombre: data.nombre,
            capacidad: data.capacidad,
            activa: data.activa,
            ...(data.horarios !== undefined
              ? { horarios: { create: data.horarios } }
              : {}),
          },
          include: includeArea,
        });
      },
    };
  }
  areas(incluirInactivas: boolean) {
    return this.prisma.areaComun.findMany({
      where: incluirInactivas ? {} : { activa: true },
      include: includeArea,
      orderBy: { nombre: 'asc' },
    });
  }
  unidades(userId: string) {
    return this.prisma.unidad.findMany({
      where: { activa: true, usuarios: { some: { userId } } },
      select: { id: true, codigo: true },
      orderBy: { codigo: 'asc' },
    });
  }
  async mias(userId: string, query: ListarReservasDto) {
    const where: Prisma.ReservaWhereInput = {
      userId,
      estado: query.estado,
    };
    const [filas, total] = await this.prisma.$transaction(
      [
        this.prisma.reserva.findMany({
          where,
          include: {
            area: { select: { nombre: true } },
          },
          orderBy: [{ inicio: 'asc' }, { id: 'asc' }],
          skip: (query.pagina - 1) * query.tamanoPagina,
          take: query.tamanoPagina,
        }),
        this.prisma.reserva.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    const datos = filas.map(({ area, ...r }) => ({
      ...r,
      areaNombre: area.nombre,
    }));
    return {
      datos,
      total,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    };
  }
  traducirDuplicado(this: void, error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ConflictException('Ya existe un área con ese nombre');
    throw error;
  }
}
