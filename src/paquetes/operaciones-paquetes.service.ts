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
  EntregaDto,
  CorreccionPaqueteDto,
} from '../administracion/administracion.dto.js';
@Injectable()
export class OperacionesPaquetesService {
  constructor(private readonly db: PrismaService) {}
  async residentesPaquete(user: User, id: string) {
    soloRoles(user.rol, 'SEGURIDAD', 'ADMINISTRADOR');
    const p = await this.db.paquete.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Paquete inexistente');
    return {
      datos: await this.db.user.findMany({
        where: {
          rol: 'RESIDENTE',
          isActive: true,
          unidades: {
            some: { unidadId: p.unidadId, unidad: { activa: true } },
          },
        },
        select: { id: true, nombre: true, email: true },
        orderBy: { nombre: 'asc' },
      }),
    };
  }
  async entregar(user: User, id: string, d: EntregaDto) {
    soloRoles(user.rol, 'SEGURIDAD');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Paquete" WHERE id=${id}::uuid FOR UPDATE`;
      const p = await tx.paquete.findUnique({ where: { id } });
      if (!p) throw new NotFoundException('Paquete inexistente');
      if (p.estado !== 'PENDIENTE')
        throw new ConflictException('El paquete ya no está pendiente');
      const residente = await tx.user.findFirst({
        where: {
          id: d.residenteId,
          rol: 'RESIDENTE',
          isActive: true,
          unidades: {
            some: { unidadId: p.unidadId, unidad: { activa: true } },
          },
        },
      });
      if (!residente)
        throw new BadRequestException(
          'Solo puede retirar un residente activo de la unidad, identificado con su información en plataforma',
        );
      return tx.paquete.update({
        where: { id },
        data: {
          estado: 'ENTREGADO',
          entregadoAt: new Date(),
          entregadoPorId: user.id,
          retiraResidenteId: residente.id,
          retiraNombre: residente.nombre,
          retiraDocumento: null,
        },
        select: {
          id: true,
          estado: true,
          entregadoAt: true,
          retiraNombre: true,
        },
      });
    });
  }
  async corregir(user: User, id: string, d: CorreccionPaqueteDto) {
    soloRoles(user.rol, 'SEGURIDAD', 'ADMINISTRADOR');
    if (d.empresa === undefined && d.descripcion === undefined && !d.estado)
      throw new BadRequestException('Indica un cambio');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Paquete" WHERE id=${id}::uuid FOR UPDATE`;
      const anterior = await tx.paquete.findUnique({ where: { id } });
      if (!anterior) throw new NotFoundException('Paquete inexistente');
      if (anterior.estado === 'ANULADO')
        throw new ConflictException('El registro ya está anulado');
      const nuevo = await tx.paquete.update({
        where: { id },
        data: {
          empresa: d.empresa,
          descripcion: d.descripcion,
          estado: d.estado,
          correccionMotivo: d.motivo,
        },
      });
      await tx.auditoriaAdministrativa.create({
        data: {
          actorId: user.id,
          recurso: 'PAQUETE',
          recursoId: id,
          accion: d.estado ? 'ANULAR' : 'CORREGIR',
          motivo: d.motivo,
          anterior: JSON.parse(
            JSON.stringify(anterior),
          ) as Prisma.InputJsonValue,
          nuevo: JSON.parse(JSON.stringify(nuevo)) as Prisma.InputJsonValue,
        },
      });
      return {
        id: nuevo.id,
        estado: nuevo.estado,
        empresa: nuevo.empresa,
        descripcion: nuevo.descripcion,
      };
    });
  }
}
