import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';
import type { PreferenciasDirectorioDto } from './directorio.dto.js';

const CAMPOS = {
  visible: true,
  mostrarTelefono: true,
  mostrarCorreo: true,
  mostrarUnidad: true,
} as const;

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
      create: { userId, ...datos },
      update: datos,
      select: CAMPOS,
    });
  }
}
