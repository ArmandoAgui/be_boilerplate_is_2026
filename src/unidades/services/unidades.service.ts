import { Injectable } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { UnidadesRepository } from '../repositories/unidades.repository.js';
import { permitir } from './unidades.rules.js';

@Injectable()
export class UnidadesService {
  constructor(private readonly repo: UnidadesRepository) {}

  /**
   * Catálogo compartido. Lo define la tarjeta de H16 en el namespace de primer
   * nivel, no dentro de paquetería, porque H17 y H19 lo necesitan igual y
   * ninguno debería depender del módulo de otro para listar unidades.
   */
  async activas(user: User, buscar: string | undefined) {
    permitir(user.rol, 'SEGURIDAD', 'ADMINISTRADOR');
    const filas = await this.repo.activas(buscar);
    return {
      datos: filas.map((u) => ({
        id: u.id,
        codigo: u.codigo,
        torre: u.torre.nombre,
      })),
    };
  }
}
