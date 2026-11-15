import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { DirectorioRepository, type FilaDirectorio } from './directorio.repository.js';
import type { BuscarDirectorioDto, PreferenciasDirectorioDto } from './directorio.dto.js';

const APAGADAS: PreferenciasDirectorioDto = {
  visible: false,
  mostrarTelefono: false,
  mostrarCorreo: false,
  mostrarUnidad: false,
};

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');

function proyectar(f: FilaDirectorio) {
  const p = f.preferenciaDirectorio;
  return {
    id: f.id,
    nombre: f.nombre,
    telefono: p?.mostrarTelefono ? (f.telefono ?? null) : null,
    correo: p?.mostrarCorreo ? f.email : null,
    unidad: p?.mostrarUnidad ? f.unidades.map((u) => u.unidad.codigo).join(', ') || null : null,
  };
}

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
  async buscar(user: User, dto: BuscarDirectorioDto) {
    this.permitir(user);
    const termino = normalizar(dto.buscar);
    const filas = await this.repo.visibles();
    const coinciden = filas
      .filter(
        (f) =>
          normalizar(f.nombre).includes(termino) ||
          // Unidad y torre solo cuentan si el vecino autorizó mostrar su unidad.
          (f.preferenciaDirectorio?.mostrarUnidad === true &&
            f.unidades.some(
              (u) =>
                normalizar(u.unidad.codigo).includes(termino) ||
                normalizar(u.unidad.torre.nombre).includes(termino),
            )),
      )
      .sort(
        (a, b) =>
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) ||
          a.id.localeCompare(b.id),
      );
    const { pagina, tamanoPagina } = dto;
    return {
      datos: coinciden.slice((pagina - 1) * tamanoPagina, pagina * tamanoPagina).map(proyectar),
      total: coinciden.length,
      pagina,
      tamanoPagina,
    };
  }
  async ficha(user: User, id: string) {
    this.permitir(user);
    const fila = await this.repo.visible(id);
    if (!fila) throw new NotFoundException('Perfil inexistente u oculto');
    return proyectar(fila);
  }
}
