import { ForbiddenException, Injectable } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { DirectorioRepository } from './directorio.repository.js';
import type { PreferenciasDirectorioDto } from './directorio.dto.js';

const APAGADAS: PreferenciasDirectorioDto = {
  visible: false,
  mostrarTelefono: false,
  mostrarCorreo: false,
  mostrarUnidad: false,
};

@Injectable()
export class DirectorioService {
  constructor(private readonly repo: DirectorioRepository) {}
  private permitir(user: User) {
    if (user.rol !== 'RESIDENTE')
      throw new ForbiddenException('No tienes permiso para realizar esta operación');
  }
  // Sin fila guardada: privacidad por defecto (no aparece, nada compartido).
  async obtener(user: User): Promise<PreferenciasDirectorioDto> {
    this.permitir(user);
    return (await this.repo.obtener(user.id)) ?? APAGADAS;
  }
  // Siempre se guardan las del usuario de la sesión; si visible es falso,
  // los tres campos se guardan en falso.
  async guardar(user: User, dto: PreferenciasDirectorioDto): Promise<PreferenciasDirectorioDto> {
    this.permitir(user);
    const datos = dto.visible ? dto : APAGADAS;
    return this.repo.guardar(user.id, {
      visible: datos.visible,
      mostrarTelefono: datos.mostrarTelefono,
      mostrarCorreo: datos.mostrarCorreo,
      mostrarUnidad: datos.mostrarUnidad,
    });
  }
}
