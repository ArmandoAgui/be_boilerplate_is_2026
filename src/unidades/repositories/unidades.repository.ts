import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import { Prisma } from '@PrismaClient';

@Injectable()
export class UnidadesRepository {
  constructor(private readonly prisma: PrismaService) {}

  activas(buscar: string | undefined) {
    // Se busca por código y por nombre de torre: en la garita la gente dice
    // "torre norte 101" tanto como "A-101".
    const where: Prisma.UnidadWhereInput = {
      activa: true,
      ...(buscar
        ? {
            OR: [
              { codigo: { contains: buscar, mode: 'insensitive' } },
              { torre: { nombre: { contains: buscar, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.prisma.unidad.findMany({
      where,
      select: { id: true, codigo: true, torre: { select: { nombre: true } } },
      orderBy: { codigo: 'asc' },
    });
  }
}
