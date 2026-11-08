import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { User } from '@PrismaClient';

import { VotacionesRepository } from '../repositories/votaciones.repository.js';

import type {
  EmitirVotoDto,
  ConsultarMiEstadoDto,
} from '../dto/votaciones.dto.js';

@Injectable()
export class VotacionesService {
  constructor(
    private readonly repo: VotacionesRepository,
  ) {}

  async temas(user: User, asambleaId: string) {
    if (
      user.rol !== 'ADMINISTRADOR' &&
      user.rol !== 'RESIDENTE'
    ) {
      throw new ForbiddenException(
        'No tienes permiso para consultar los temas.',
      );
    }

    return this.repo.temasDeAsamblea(asambleaId);
  }

  async resultados(user: User, temaId: string) {
    if (user.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Solo administradores pueden consultar resultados.',
      );
    }

    const result = await this.repo.resultados(temaId);

    if (!result) {
      throw new NotFoundException(
        'Tema de votación inexistente.',
      );
    }

    const status = await this.repo.estadoTema(temaId);

    if (status !== 'CERRADO') {
      throw new ConflictException(
        'Los resultados estarán disponibles al cierre de la votación.',
      );
    }

    return result;
  }

  async emitir(
    user: User,
    temaId: string,
    dto: EmitirVotoDto,
  ) {
    if (user.rol !== 'RESIDENTE') {
      throw new ForbiddenException(
        'Solo los residentes pueden emitir votos.',
      );
    }

    return this.repo.emitirVoto(
      user.id,
      dto.unidadId,
      temaId,
      dto.opcionId,
    );
  }

  async miEstado(
    user: User,
    temaId: string,
    dto: ConsultarMiEstadoDto,
  ) {
    if (user.rol !== 'RESIDENTE') {
      throw new ForbiddenException(
        'Solo los residentes pueden consultar su participación.',
      );
    }

    return this.repo.miEstado(
      user.id,
      dto.unidadId,
      temaId,
    );
  }
}
