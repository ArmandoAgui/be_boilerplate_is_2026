import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { Prisma } from '@PrismaClient';
import type { PreferenciasDirectorioDto } from './directorio.dto.js';

const CAMPOS = {
  visible: true,
  mostrarTelefono: true,
  mostrarCorreo: true,
  mostrarUnidad: true,
} as const;
const FICHA = {
  id: true,
  nombre: true,
  email: true,
  telefono: true,
  preferenciaDirectorio: {
    select: { mostrarTelefono: true, mostrarCorreo: true, mostrarUnidad: true },
  },
  unidades: {
    where: { unidad: { activa: true } },
    select: {
      unidad: { select: { codigo: true, torre: { select: { nombre: true } } } },
    },
  },
} satisfies Prisma.UserSelect;
export type FilaDirectorio = Prisma.UserGetPayload<{ select: typeof FICHA }>;
// Solo residentes activos que decidieron aparecer.
const VISIBLES: Prisma.UserWhereInput = {
  rol: 'RESIDENTE',
  isActive: true,
  preferenciaDirectorio: { is: { visible: true } },
};

@Injectable()
export class DirectorioRepository {
  constructor(private readonly prisma: PrismaService) {}
  obtener(userId: string) {
    return this.prisma.preferenciaDirectorio.findUnique({
      where: { userId },
      select: CAMPOS,
    });
  }
  guardar(userId: string, datos: PreferenciasDirectorioDto) {
    return this.prisma.preferenciaDirectorio.upsert({
      where: { userId },
      create: {
        userId,
        visible: datos.visible,
        mostrarTelefono: datos.mostrarTelefono,
        mostrarCorreo: datos.mostrarCorreo,
        mostrarUnidad: datos.mostrarUnidad,
      },
      update: datos,
      select: CAMPOS,
    });
  }
  visibles() {
    return this.prisma.user.findMany({ where: VISIBLES, select: FICHA });
  }
  visible(id: string) {
    return this.prisma.user.findFirst({
      where: { ...VISIBLES, id },
      select: FICHA,
    });
  }
}
