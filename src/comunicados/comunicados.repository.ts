import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma, type Alcance } from '@PrismaClient';
import type {
  AudienciaComunicadoDto,
  CrearComunicadoDto,
  PaginaComunicadosDto,
} from './comunicados.dto.js';
type Db = Prisma.TransactionClient;
export function residentesAlcance(
  alcance: Alcance,
  destinoId?: string | null,
): Prisma.UserWhereInput {
  return {
    rol: 'RESIDENTE',
    isActive: true,
    ...(alcance === 'TODOS'
      ? {}
      : {
          unidades: {
            some: {
              unidad:
                alcance === 'TORRE'
                  ? { torreId: destinoId! }
                  : { seccionId: destinoId! },
            },
          },
        }),
  };
}
@Injectable()
export class ComunicadosRepository {
  constructor(private readonly prisma: PrismaService) {}
  private async validarDestino(tx: Db, dto: AudienciaComunicadoDto) {
    if (dto.alcance === 'TODOS') {
      if (dto.destinoId !== undefined)
        throw new BadRequestException('Todos no admite destino');
    } else {
      const destino =
        dto.alcance === 'TORRE'
          ? await tx.torre.findUnique({ where: { id: dto.destinoId } })
          : await tx.seccion.findUnique({ where: { id: dto.destinoId } });
      if (!destino) throw new NotFoundException('Destino inexistente');
    }
  }
  torres() {
    return this.prisma.torre.findMany({
      select: {
        id: true,
        nombre: true,
        secciones: {
          select: { id: true, nombre: true },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }
  previa(dto: AudienciaComunicadoDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.validarDestino(tx, dto);
        return {
          destinatarios: await tx.user.count({
            where: residentesAlcance(dto.alcance, dto.destinoId),
          }),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  crear(autorId: string, dto: CrearComunicadoDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.validarDestino(tx, dto);
        const destinatarios = await tx.user.count({
          where: residentesAlcance(dto.alcance, dto.destinoId),
        });
        const creado = await tx.comunicado.create({
          data: {
            autorId,
            titulo: dto.titulo,
            contenido: dto.contenido,
            alcance: dto.alcance,
            torreId: dto.alcance === 'TORRE' ? dto.destinoId : null,
            seccionId: dto.alcance === 'SECCION' ? dto.destinoId : null,
          },
        });
        return {
          id: creado.id,
          titulo: creado.titulo,
          alcance: creado.alcance,
          destinatarios,
          creadoAt: creado.createdAt,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  administracion(query: PaginaComunicadosDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const filas = await tx.comunicado.findMany({
          include: {
            torre: { select: { nombre: true } },
            seccion: { include: { torre: { select: { nombre: true } } } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (query.pagina - 1) * query.tamanoPagina,
          take: query.tamanoPagina,
        });
        const datos = await Promise.all(
          filas.map(async (c) => {
            const audiencia = residentesAlcance(
              c.alcance,
              c.torreId ?? c.seccionId,
            );
            return {
              id: c.id,
              titulo: c.titulo,
              alcance: c.alcance,
              destino:
                c.torre?.nombre ??
                (c.seccion
                  ? `${c.seccion.torre.nombre} · ${c.seccion.nombre}`
                  : null),
              creadoAt: c.createdAt,
              destinatarios: await tx.user.count({ where: audiencia }),
              leidoPor: await tx.lecturaComunicado.count({
                where: { comunicadoId: c.id, user: audiencia },
              }),
            };
          }),
        );
        return {
          datos,
          total: await tx.comunicado.count(),
          pagina: query.pagina,
          tamanoPagina: query.tamanoPagina,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
