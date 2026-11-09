import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { ReadStream } from 'node:fs';
import type { CrearIncidenciaDto } from '../dto/crear-incidencia.dto.js';
import { IncidenciaCreadaDto } from '../dto/incidencia-creada.dto.js';
import { IncidenciasRepository } from '../repositories/incidencias.repository.js';
import {
  ArchivoEvidenciaNoDisponibleError,
  EvidenciasStorage,
} from '../storage/evidencias.storage.js';
import type { MimeFotoIncidencia } from '../validators/fotos-incidencia.validator.js';
import { validarFotosIncidencia } from '../validators/fotos-incidencia.validator.js';
import { IncidenciaEvidenciaNoEncontradaError } from '../errors/incidencias.errors.js';
import { IncidenciaLugarService } from './incidencia-lugar.service.js';

export interface EvidenciaPrivadaLectura {
  readonly stream: ReadStream;
  readonly mimeType: MimeFotoIncidencia;
}

@Injectable()
export class IncidenciasService {
  private readonly logger = new Logger(IncidenciasService.name);

  constructor(
    private readonly incidenciasRepository: IncidenciasRepository,
    private readonly incidenciaLugarService: IncidenciaLugarService,
    private readonly evidenciasStorage: EvidenciasStorage,
  ) {}

  async crear(
    residenteId: string,
    dto: CrearIncidenciaDto,
    archivos?: readonly Express.Multer.File[],
  ): Promise<IncidenciaCreadaDto> {
    await this.incidenciaLugarService.validar(residenteId, dto);
    const fotos = await validarFotosIncidencia(archivos);
    const lote = await this.evidenciasStorage.guardarLote(fotos);

    let entidad: Awaited<
      ReturnType<IncidenciasRepository['createWithInitialHistory']>
    >;
    try {
      entidad = await this.incidenciasRepository.createWithInitialHistory({
        residenteId,
        lugarTipo: dto.lugarTipo,
        unidadId: dto.unidadId ?? null,
        areaId: dto.areaId ?? null,
        categoria: dto.categoria,
        descripcion: dto.descripcion,
        evidencias: lote.evidencias,
      });
    } catch (error) {
      await lote.compensar(error);
      throw error;
    }

    // Confirmar inmediatamente tras el commit; errores al mapear la respuesta
    // no deben retirar archivos asociados a filas ya persistidas.
    lote.confirmarPersistencia();
    return IncidenciaCreadaDto.fromEntity(entidad);
  }

  async leerEvidencia(
    usuarioId: string,
    incidenciaId: string,
    evidenciaId: string,
  ): Promise<EvidenciaPrivadaLectura> {
    if (!isUUID(incidenciaId)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'incidenciaId debe ser un UUID válido.',
        campo: 'incidenciaId',
      });
    }
    if (!isUUID(evidenciaId)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'evidenciaId debe ser un UUID válido.',
        campo: 'evidenciaId',
      });
    }

    const usuario = await this.incidenciasRepository.findUserAccess(usuarioId);
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException('La cuenta no existe o está inactiva.');
    }

    const evidencia = await this.incidenciasRepository.findEvidenceForRead(
      incidenciaId,
      evidenciaId,
    );
    if (!evidencia) throw new IncidenciaEvidenciaNoEncontradaError();

    const autorizado =
      usuario.rol === 'ADMINISTRADOR' ||
      (usuario.rol === 'RESIDENTE' && evidencia.residenteId === usuarioId) ||
      (usuario.rol === 'SEGURIDAD' && evidencia.responsableId === usuarioId);
    if (!autorizado) throw new IncidenciaEvidenciaNoEncontradaError();

    if (evidencia.mime !== 'image/jpeg' && evidencia.mime !== 'image/png') {
      this.logger.error(
        `La evidencia ${evidencia.id} de la incidencia ${evidencia.incidenciaId} ` +
          'tiene un MIME persistido no permitido.',
      );
      throw new Error('El MIME persistido de la evidencia no está permitido.');
    }

    let stream: ReadStream;
    try {
      stream = await this.evidenciasStorage.abrirLectura(evidencia.ruta);
    } catch (error) {
      if (!(error instanceof ArchivoEvidenciaNoDisponibleError)) throw error;

      this.logger.error(
        `No está disponible el archivo de la evidencia ${evidencia.id} ` +
          `de la incidencia ${evidencia.incidenciaId}.`,
        error.cause instanceof Error ? error.cause.stack : undefined,
      );
      throw new IncidenciaEvidenciaNoEncontradaError();
    }

    stream.on('error', (error: Error) => {
      this.logger.error(
        `Falló la lectura del archivo de la evidencia ${evidencia.id} ` +
          `de la incidencia ${evidencia.incidenciaId}.`,
        error.stack,
      );
    });

    return { stream, mimeType: evidencia.mime };
  }
}
