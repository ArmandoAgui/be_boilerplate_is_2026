import {
  tarifaMensual,
  PORCENTAJE_RECARGO,
} from '../cuotas/services/importes.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma, type User } from '@PrismaClient';
import { soloRoles } from '../cuotas/services/cuotas.rules.js';
import {
  VinculoDto,
  AjusteCuotaDto,
  PaginaAdminDto,
} from './administracion.dto.js';
@Injectable()
export class AdministracionService {
  constructor(private readonly db: PrismaService) {}
  async catalogos(user: User) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    return {
      residentes: await this.db.user.findMany({
        where: { rol: 'RESIDENTE', isActive: true },
        select: {
          id: true,
          nombre: true,
          email: true,
          unidades: { select: { unidadId: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      unidades: await this.db.unidad.findMany({
        where: { activa: true },
        select: { id: true, codigo: true },
        orderBy: { codigo: 'asc' },
      }),
    };
  }
  async vincular(user: User, d: VinculoDto) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    return this.db.$transaction(async (tx) => {
      if (
        !(await tx.user.findFirst({
          where: { id: d.userId, rol: 'RESIDENTE', isActive: true },
        })) ||
        !(await tx.unidad.findFirst({
          where: { id: d.unidadId, activa: true },
        }))
      )
        throw new BadRequestException('Selecciona residente y unidad activos');
      return tx.usuarioUnidad.upsert({
        where: { userId_unidadId: { userId: d.userId, unidadId: d.unidadId } },
        create: { userId: d.userId, unidadId: d.unidadId },
        update: {},
      });
    });
  }
  async cuotas(user: User, q: PaginaAdminDto) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    const [datos, total] = await this.db.$transaction([
      this.db.cuota.findMany({
        include: { unidad: { select: { codigo: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.pagina - 1) * 20,
        take: 20,
      }),
      this.db.cuota.count(),
    ]);
    return {
      datos,
      total,
      pagina: q.pagina,
      tamanoPagina: 20,
      tarifaMensual: tarifaMensual().toFixed(2),
      porcentajeRecargo: PORCENTAJE_RECARGO,
    };
  }
  async ajustarCuota(user: User, id: string, d: AjusteCuotaDto) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    if (d.monto === undefined && !d.fechaVencimiento && !d.estado)
      throw new BadRequestException('Indica un cambio');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cuota" WHERE id=${id}::uuid FOR UPDATE`;
      const anterior = await tx.cuota.findUnique({ where: { id } });
      if (!anterior) throw new NotFoundException('Cuota inexistente');
      if (anterior.estado !== 'PENDIENTE')
        throw new ConflictException(
          'Solo se ajustan cuotas pendientes; los pagos y anulaciones conservan su historial',
        );
      const nuevo = await tx.cuota.update({
        where: { id },
        data: {
          monto: d.monto,
          fechaVencimiento: d.fechaVencimiento
            ? new Date(d.fechaVencimiento + 'T00:00:00Z')
            : undefined,
          estado: d.estado,
        },
      });
      await tx.auditoriaAdministrativa.create({
        data: {
          actorId: user.id,
          recurso: 'CUOTA',
          recursoId: id,
          accion: d.estado ? 'ANULAR' : 'CORREGIR',
          motivo: d.motivo,
          anterior: JSON.parse(
            JSON.stringify(anterior),
          ) as Prisma.InputJsonValue,
          nuevo: JSON.parse(JSON.stringify(nuevo)) as Prisma.InputJsonValue,
        },
      });
      return nuevo;
    });
  }
  async residentesUnidad(user: User, id: string) {
    soloRoles(user.rol, 'SEGURIDAD', 'ADMINISTRADOR');
    return {
      datos: await this.db.user.findMany({
        where: {
          rol: 'RESIDENTE',
          isActive: true,
          unidades: { some: { unidadId: id, unidad: { activa: true } } },
        },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
    };
  }
}
