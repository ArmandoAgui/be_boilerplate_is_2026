import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { User } from '@PrismaClient';

import { AsambleasRepository } from '../repositories/asambleas.repository.js';

import type {
  CrearAsambleaDto,
  ListarAsambleasDto,
} from '../dto/asambleas.dto.js';

@Injectable()
export class AsambleasService {
  constructor(
    private readonly repo: AsambleasRepository,
  ) {}

  async crear(user: User, dto: CrearAsambleaDto) {
    this.validarAdministrador(user);

    const temas = (dto.temas ?? []).map((tema) => {
      const opciones = tema.opciones.map((opcion) =>
        opcion.texto.trim(),
      );

      const opcionesNormalizadas = opciones.map((opcion) =>
        opcion.toLocaleLowerCase('es'),
      );

      if (
        new Set(opcionesNormalizadas).size !== opciones.length
      ) {
        throw new BadRequestException(
          'Las opciones de un tema no pueden repetirse.',
        );
      }

      return {
        titulo: tema.titulo.trim(),
        apertura: new Date(tema.apertura),
        cierre: new Date(tema.cierre),
        opciones,
      };
    });

    return this.repo.crear(user.id, {
      titulo: dto.titulo.trim(),
      fechaHora: new Date(dto.fechaHora),
      descripcion: dto.descripcion?.trim(),
      temas,
    });
  }

  async publicar(user: User, id: string) {
    this.validarAdministrador(user);

    const asamblea = await this.repo.buscarPorId(id);

    if (!asamblea) {
      throw new NotFoundException(
        'Asamblea inexistente.',
      );
    }

    if (asamblea.estado === 'PUBLICADA') {
      throw new ConflictException(
        'La asamblea ya fue publicada.',
      );
    }

    const ahora = new Date();

    if (asamblea.fechaHora <= ahora) {
      throw new BadRequestException(
        'La fecha de la asamblea debe ser posterior a ahora.',
      );
    }

    if (!asamblea.temas.length) {
      throw new BadRequestException(
        'La asamblea debe tener al menos un tema.',
      );
    }

    for (const tema of asamblea.temas) {
      if (tema.apertura <= ahora) {
        throw new BadRequestException(
          'La apertura de cada tema debe ser posterior a ahora.',
        );
      }

      if (tema.cierre <= tema.apertura) {
        throw new BadRequestException(
          'El cierre debe ser posterior a la apertura.',
        );
      }

      if (
        tema.opciones.length < 2 ||
        tema.opciones.length > 10
      ) {
        throw new BadRequestException(
          'Cada tema necesita entre 2 y 10 opciones.',
        );
      }

      const opciones = tema.opciones.map((opcion) =>
        opcion.texto.trim().toLocaleLowerCase('es'),
      );

      if (new Set(opciones).size !== opciones.length) {
        throw new BadRequestException(
          'Las opciones de cada tema deben ser únicas.',
        );
      }
    }

    const resultado = await this.repo.publicar(id);

    if (resultado.count === 0) {
      throw new ConflictException(
        'La asamblea ya fue publicada o modificada.',
      );
    }

    return {
      id,
      estado: 'PUBLICADA',
    };
  }

  async listar(
    user: User,
    query: ListarAsambleasDto,
  ) {
    if (
      user.rol !== 'RESIDENTE' &&
      user.rol !== 'ADMINISTRADOR'
    ) {
      throw new ForbiddenException(
        'No tienes permiso para consultar asambleas.',
      );
    }

    const resultado = await this.repo.listar(
      user.rol,
      query.estado,
      query.pagina,
      query.tamanoPagina,
    );

    const ahora = new Date();

    return {
      ...resultado,
      datos: resultado.datos.map((asamblea) => ({
        ...asamblea,
        temas: asamblea.temas.map((tema) => ({
          ...tema,
          estadoTema:
            ahora < tema.apertura
              ? 'PUBLICADA'
              : ahora >= tema.cierre
                ? 'CERRADO'
                : 'ABIERTO',
        })),
      })),
    };
  }

  async temasDeAsamblea(user: User, asambleaId: string) {
    const asamblea =
      await this.repo.temasDeAsamblea(asambleaId);

    if (!asamblea) {
      throw new NotFoundException(
        'Asamblea inexistente.',
      );
    }

    if (
      user.rol === 'RESIDENTE' &&
      asamblea.estado !== 'PUBLICADA'
    ) {
      throw new NotFoundException(
        'Asamblea inexistente.',
      );
    }

    if (
      user.rol !== 'RESIDENTE' &&
      user.rol !== 'ADMINISTRADOR'
    ) {
      throw new ForbiddenException(
        'No tienes permiso para consultar esta asamblea.',
      );
    }

    const ahora = new Date();

    return asamblea.temas.map((tema) => ({
      id: tema.id,
      titulo: tema.titulo,
      apertura: tema.apertura,
      cierre: tema.cierre,
      estado:
        ahora < tema.apertura
          ? 'PUBLICADA'
          : ahora >= tema.cierre
            ? 'CERRADO'
            : 'ABIERTO',
      opciones: tema.opciones,
    }));
  }

  private validarAdministrador(user: User) {
    if (user.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Solo un administrador puede realizar esta operación.',
      );
    }
  }
}
