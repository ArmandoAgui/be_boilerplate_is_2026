import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';

export const TEMAS_APERTURA_TAMANO_LOTE = 100;

@Injectable()
export class AsambleasRepository {
  constructor(private readonly prisma: PrismaService) {}
  crear(
    userId: string,
    d: {
      titulo: string;
      fechaAt: Date;
      descripcion?: string;
      temas: {
        pregunta: string;
        aperturaAt: Date;
        cierreAt: Date;
        opciones: string[];
      }[];
    },
  ) {
    return this.prisma.asamblea.create({
      data: {
        titulo: d.titulo,
        fechaAt: d.fechaAt,
        descripcion: d.descripcion,
        creadorId: userId,
        temas: {
          create: d.temas.map((t) => ({
            pregunta: t.pregunta,
            aperturaAt: t.aperturaAt,
            cierreAt: t.cierreAt,
            opciones: {
              create: t.opciones.map((texto) => ({ texto: texto.trim() })),
            },
          })),
        },
      },
      include: { temas: { include: { opciones: true } } },
    });
  }
  publicar(id: string) {
    return this.prisma.asamblea.updateMany({
      where: { id, estado: 'BORRADOR' },
      data: { estado: 'PUBLICADA', publicadaAt: new Date() },
    });
  }
  una(id: string) {
    return this.prisma.asamblea.findUnique({
      where: { id },
      include: { temas: { include: { opciones: true } } },
    });
  }
  listar() {
    return this.prisma.asamblea.findMany({
      where: { estado: 'PUBLICADA' },
      orderBy: { fechaAt: 'asc' },
      include: {
        temas: { include: { opciones: true }, orderBy: { createdAt: 'asc' } },
      },
    });
  }
  unidadActivaVinculada(userId: string, unidadId: string) {
    return this.prisma.usuarioUnidad.findFirst({
      where: {
        userId,
        unidadId,
        unidad: { activa: true },
        user: { isActive: true, rol: 'RESIDENTE' },
      },
      select: { id: true },
    });
  }
  tema(id: string) {
    return this.prisma.temaVotacion.findUnique({
      where: { id },
      include: { asamblea: true, opciones: true },
    });
  }
  temasPendientesDeApertura(ahora: Date, despuesDeId?: string) {
    return this.prisma.temaVotacion.findMany({
      where: {
        notificadoApertura: false,
        aperturaAt: { lte: ahora },
        cierreAt: { gte: ahora },
        asamblea: { is: { estado: 'PUBLICADA' } },
        ...(despuesDeId ? { id: { gt: despuesDeId } } : {}),
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: TEMAS_APERTURA_TAMANO_LOTE,
    });
  }
  estadoVoto(temaId: string, unidadId: string) {
    return this.prisma.participacionVoto.findUnique({
      where: { unidadId_temaId: { unidadId, temaId } },
      select: { id: true, createdAt: true },
    });
  }
    // H22: conteo por opción. Solo lee Voto (no tiene unidad ni usuario).
  votosPorOpcion(temaId: string) {
    return this.prisma.voto.groupBy({
      by: ['opcionId'],
      where: { temaId },
      _count: { _all: true },
    });
  }
  // H22: evidencia. Solo lee ParticipacionVoto (no tiene opción).
  participaciones(temaId: string) {
    return this.prisma.participacionVoto.findMany({
      where: { temaId },
      select: {
        createdAt: true,
        unidad: { select: { id: true, codigo: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { unidad: { codigo: 'asc' } }],
    });
  }
  // H22: unidades activas con al menos un residente activo.
  unidadesHabilitadas() {
    return this.prisma.unidad.count({
      where: {
        activa: true,
        usuarios: { some: { user: { isActive: true, rol: 'RESIDENTE' } } },
      },
    });
  }
  async votar(temaId: string, unidadId: string, opcionId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const tema = await tx.temaVotacion.findUnique({
          where: { id: temaId },
          include: { opciones: { select: { id: true } } },
        });
        if (!tema) return null;
        const opcionValida = tema.opciones.some((o) => o.id === opcionId);
        if (!opcionValida) return { opcionInvalida: true as const };
        const participacion = await tx.participacionVoto.create({
          data: { temaId, unidadId },
        });
        await tx.voto.create({ data: { temaId, opcionId } });
        return participacion;
      },
      { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 },
    );
  }
}
