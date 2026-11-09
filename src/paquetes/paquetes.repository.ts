
import { Injectable } from '@nestjs/common';
import { Prisma } from '@PrismaClient';
import { PrismaService } from '@Prisma/services';

@Injectable()
export class PaquetesRepository {
    constructor(private readonly prisma: PrismaService) {}

    vinculo(userId: string, unidadId: string) {
        return this.prisma.usuarioUnidad.findUnique({
            where: {
                userId_unidadId: { userId, unidadId },
            },
            select: {
                id: true,
                unidad: {
                    select: { activa: true },
                },
            },
        });
    }

    listar(
        unidadId: string,
        estado: 'PENDIENTE' | 'ENTREGADO' | undefined,
        pagina: number,
        tamanoPagina: number,
    ) {
        const where: Prisma.PaqueteWhereInput = {
            unidadId,
            ...(estado ? { estado } : {}),
        };

        const orderBy: Prisma.PaqueteOrderByWithRelationInput[] =
            estado === 'ENTREGADO'
                ? [{ entregadoAt: 'desc' }, { id: 'asc' }]
                : estado === 'PENDIENTE'
                    ? [{ recibidoAt: 'asc' }, { id: 'asc' }]
                    : [{ recibidoAt: 'desc' }, { id: 'asc' }];

        return this.prisma.$transaction(
            [
                this.prisma.paquete.findMany({
                    where,
                    orderBy,
                    skip: (pagina - 1) * tamanoPagina,
                    take: tamanoPagina,
                    select: {
                        id: true,
                        codigo: true,
                        empresa: true,
                        descripcion: true,
                        recibidoAt: true,
                        estado: true,
                        entregadoAt: true,
                        retiraNombre: true,
                    },
                }),
                this.prisma.paquete.count({ where }),
            ],
            { isolationLevel: 'RepeatableRead' },
        );
    }

    detalle(id: string) {
        return this.prisma.paquete.findUnique({
            where: { id },
            select: {
                id: true,
                codigo: true,
                empresa: true,
                descripcion: true,
                recibidoAt: true,
                estado: true,
                entregadoAt: true,
                retiraNombre: true,
                unidadId: true,
            },
        });
    }
}
