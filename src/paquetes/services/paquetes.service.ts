import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { User } from '@PrismaClient';

import { PaquetesRepository } from '../repositories/paquetes.repository.js';
import type { ListarMisPaquetesDto } from '../dto/paquetes.dto.js';

@Injectable()
export class PaquetesService {
  constructor(
    private readonly repo: PaquetesRepository,
  ) {}

  async mios(
    user: User,
    query: ListarMisPaquetesDto,
  ) {
    if (user.rol !== 'RESIDENTE') {
      throw new ForbiddenException(
        'Solo los residentes pueden consultar sus paquetes.',
      );
    }

    const tieneAcceso = await this.repo.perteneceUnidad(
      user.id,
      query.unidadId,
    );

    if (!tieneAcceso) {
      throw new ForbiddenException(
        'No tienes acceso a esa unidad.',
      );
    }

    return this.repo.listar(
      query.unidadId,
      query.estado,
      query.pagina,
      query.tamanoPagina,
    );
  }

  async detalle(user: User, id: string) {
    if (user.rol !== 'RESIDENTE') {
      throw new ForbiddenException(
        'Solo los residentes pueden consultar sus paquetes.',
      );
    }

    const paquete = await this.repo.detalle(id, user.id);

    if (!paquete) {
      throw new NotFoundException(
        'Paquete inexistente.',
      );
    }

    return paquete;
  }
}
