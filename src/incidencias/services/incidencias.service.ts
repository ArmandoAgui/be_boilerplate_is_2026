import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { EstadoIncidencia } from '@PrismaClient';
import type { ReadStream } from 'node:fs';
import type { CrearIncidenciaDto } from '../dto/crear-incidencia.dto.js';
import { IncidenciaCreadaDto } from '../dto/incidencia-creada.dto.js';
import type { ActualizarEstadoIncidenciaDto } from '../dto/actualizar-estado-incidencia.dto.js';
import { EstadoIncidenciaActualizadoDto } from '../dto/estado-incidencia-actualizado.dto.js';
import type { ListarIncidenciasDto } from '../dto/listar-incidencias.dto.js';
import type { ListadoIncidenciasDto } from '../dto/incidencia-listado.dto.js';
import { IncidenciaDetalleDto } from '../dto/incidencia-detalle.dto.js';
import type { ListarIncidenciasMiasDto } from '../dto/listar-incidencias-mias.dto.js';
import { ListadoIncidenciasMiasDto as ListadoIncidenciasMiasResponseDto } from '../dto/incidencias-mias.dto.js';
import type { ListarResponsablesDto } from '../dto/listar-responsables.dto.js';
import type { ListadoResponsablesDto } from '../dto/responsable-incidencia.dto.js';
import type { ActualizarAsignacionDto } from '../dto/actualizar-asignacion.dto.js';
import type { AsignacionActualizadaDto } from '../dto/asignacion-actualizada.dto.js';
import { IncidenciasRepository } from '../repositories/incidencias.repository.js';
import {
  ArchivoEvidenciaNoDisponibleError,
  EvidenciasStorage,
} from '../storage/evidencias.storage.js';
import type { MimeFotoIncidencia } from '../validators/fotos-incidencia.validator.js';
import { validarFotosIncidencia } from '../validators/fotos-incidencia.validator.js';
import {
  AdministradorIncidenciasRequeridoError,
  IncidenciaDetalleNoEncontradaError,
  IncidenciaResueltaError,
  IncidenciaEvidenciaNoEncontradaError,
  NotificacionesH28FallidasError,
  NotificacionesH28NoDisponiblesError,
  RolIncidenciaNoAutorizadoError,
  ResponsableIncidenciaNoValidoError,
  SolicitudAsignacionVaciaError,
  UsuarioIncidenciaNoDisponibleError,
} from '../errors/incidencias.errors.js';
import { IncidenciaLugarService } from './incidencia-lugar.service.js';
import { calcularPlanAsignacion } from './asignacion-incidencia.rules.js';
import { calcularTransicionEstadoIncidencia } from './estado-incidencia.rules.js';
import { crearIncidenciaResueltaPayload } from '../notificaciones/incidencia-resuelta.payload.js';
import {
  H28_NOTIFICACIONES_PORT,
  type H28NotificacionesPort,
} from '../notificaciones/h28-notificaciones.port.js';
import { puedeLeerIncidencia } from './incidencias-lectura.rules.js';

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
    @Optional()
    @Inject(H28_NOTIFICACIONES_PORT)
    private readonly notificacionesH28?: H28NotificacionesPort,
  ) {}

  /** Revalida identidad/rol para que los métodos internos no dependan del guard. */
  async verificarAdministradorActivo(usuarioId: string): Promise<void> {
    if (!isUUID(usuarioId)) throw new UsuarioIncidenciaNoDisponibleError();

    const usuario = await this.incidenciasRepository.findUserAccess(usuarioId);
    if (!usuario || !usuario.isActive) {
      throw new UsuarioIncidenciaNoDisponibleError();
    }
    if (usuario.rol !== 'ADMINISTRADOR') {
      throw new AdministradorIncidenciasRequeridoError();
    }
  }

  /** Revalida el rol del usuario que JwtAuthGuard cargó desde la base. */
  verificarResidenteActivo(usuarioId: string, rol: string): void {
    if (!isUUID(usuarioId)) throw new UsuarioIncidenciaNoDisponibleError();
    if (rol !== 'RESIDENTE') {
      throw new RolIncidenciaNoAutorizadoError(
        'Solo un residente puede consultar sus incidencias.',
      );
    }
  }

  async listarMias(
    residenteId: string,
    rol: string,
    query: ListarIncidenciasMiasDto,
  ): Promise<ListadoIncidenciasMiasResponseDto> {
    this.verificarResidenteActivo(residenteId, rol);
    const offset = this.calcularOffsetSeguro(query.pagina, query.tamanoPagina);
    const pagina = await this.incidenciasRepository.listarMias(
      residenteId,
      query,
      offset,
    );

    return ListadoIncidenciasMiasResponseDto.fromEntity({
      datos: pagina.datos,
      total: pagina.total,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    });
  }

  async listarAdministrativamente(
    administradorId: string,
    query: ListarIncidenciasDto,
  ): Promise<ListadoIncidenciasDto> {
    await this.verificarAdministradorActivo(administradorId);

    const offset = this.calcularOffsetSeguro(query.pagina, query.tamanoPagina);

    const pagina = await this.incidenciasRepository.listarAdministrativamente(
      query,
      offset,
    );
    return {
      datos: pagina.datos.map((incidencia) => ({
        ...incidencia,
        creadaAt: incidencia.creadaAt.toISOString(),
      })),
      total: pagina.total,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    };
  }

  async listarResponsablesAdministrativamente(
    administradorId: string,
    query: ListarResponsablesDto,
  ): Promise<ListadoResponsablesDto> {
    await this.verificarAdministradorActivo(administradorId);
    const offset = this.calcularOffsetSeguro(query.pagina, query.tamanoPagina);
    const pagina =
      await this.incidenciasRepository.listarResponsablesAdministrativamente(
        query,
        offset,
      );

    if (!Number.isSafeInteger(pagina.total) || pagina.total < 0) {
      throw new Error('El conteo de responsables excede el entero seguro.');
    }

    return {
      datos: pagina.datos,
      total: pagina.total,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    };
  }

  async actualizarAsignacion(
    administradorId: string,
    incidenciaId: string,
    solicitud: ActualizarAsignacionDto,
  ): Promise<AsignacionActualizadaDto> {
    await this.verificarAdministradorActivo(administradorId);

    if (!isUUID(incidenciaId)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'id debe ser un UUID válido.',
        campo: 'id',
      });
    }
    if (
      solicitud.prioridad === undefined &&
      solicitud.responsableId === undefined
    ) {
      throw new SolicitudAsignacionVaciaError();
    }

    return this.incidenciasRepository.conBloqueoAsignacion(
      incidenciaId,
      async (sesion) => {
        if (sesion.actual.estado === 'RESUELTA') {
          throw new IncidenciaResueltaError();
        }

        let candidato:
          Awaited<ReturnType<typeof sesion.buscarCandidato>> | undefined;
        if (solicitud.responsableId !== undefined) {
          if (!isUUID(solicitud.responsableId)) {
            throw new ResponsableIncidenciaNoValidoError();
          }
          candidato = await sesion.buscarCandidato(solicitud.responsableId);
        }

        const plan = calcularPlanAsignacion({
          actual: sesion.actual,
          solicitud,
          responsableSolicitado: candidato,
          actorId: administradorId,
          ahora: new Date(),
        });
        return sesion.aplicarPlan(plan);
      },
    );
  }

  async actualizarEstado(
    administradorId: string,
    incidenciaId: string,
    solicitud: ActualizarEstadoIncidenciaDto,
  ): Promise<EstadoIncidenciaActualizadoDto> {
    await this.verificarAdministradorActivo(administradorId);

    if (!isUUID(incidenciaId)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'id debe ser un UUID válido.',
        campo: 'id',
      });
    }

    const actualizada = await this.incidenciasRepository.conBloqueoEstado(
      incidenciaId,
      async (sesion) => {
        const transicion = calcularTransicionEstadoIncidencia(
          sesion.actual.estado,
          solicitud.estado,
        );

        // Nunca confirmar RESUELTA si el proveedor real de H28 no está enlazado.
        if (
          transicion.estadoDestino === EstadoIncidencia.RESUELTA &&
          !this.notificacionesH28
        ) {
          throw new NotificacionesH28NoDisponiblesError();
        }

        return sesion.aplicarTransicion(transicion, administradorId);
      },
    );

    if (actualizada.estado === EstadoIncidencia.RESUELTA) {
      const payload = crearIncidenciaResueltaPayload(actualizada);
      try {
        const resultado = await this.notificacionesH28!.crear(payload);
        if (
          !resultado ||
          !Number.isSafeInteger(resultado.creadas) ||
          resultado.creadas < 0
        ) {
          throw new Error('H28 devolvió un resultado de creación inválido.');
        }
      } catch (error) {
        this.logger.error(
          JSON.stringify({
            evento: 'H11_H28_AVISO_FALLIDO_TRAS_COMMIT',
            incidenciaId: actualizada.id,
            claveEvento: payload.claveEvento,
            residenteId: payload.destinatario.id,
            estadoConfirmado: actualizada.estado,
            fechaConfirmacion: actualizada.updatedAt.toISOString(),
          }),
          error instanceof Error ? error.stack : undefined,
        );
        throw new NotificacionesH28FallidasError();
      }
    }

    return EstadoIncidenciaActualizadoDto.fromEntity(actualizada);
  }

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

  async leerDetalle(
    usuarioId: string,
    incidenciaId: string,
  ): Promise<IncidenciaDetalleDto> {
    if (!isUUID(incidenciaId)) {
      throw new IncidenciaDetalleNoEncontradaError();
    }

    const detalle = await this.incidenciasRepository.leerDetalle(
      usuarioId,
      incidenciaId,
      puedeLeerIncidencia,
    );
    if (!detalle) throw new IncidenciaDetalleNoEncontradaError();
    if (detalle.lugar === null) {
      this.logger.error(
        `La incidencia ${detalle.id} tiene una ubicación persistida inconsistente.`,
      );
      throw new Error('La incidencia no tiene una ubicación consistente.');
    }

    return IncidenciaDetalleDto.fromEntity({
      ...detalle,
      lugar: detalle.lugar,
    });
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

    const autorizado = puedeLeerIncidencia(
      { id: usuarioId, rol: usuario.rol },
      evidencia,
    );
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

  private calcularOffsetSeguro(pagina: number, tamanoPagina: number): number {
    if (!Number.isSafeInteger(pagina) || pagina < 1) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'La página solicitada no puede representarse de forma segura.',
        campo: 'pagina',
      });
    }
    if (
      !Number.isInteger(tamanoPagina) ||
      tamanoPagina < 1 ||
      tamanoPagina > 50
    ) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'tamanoPagina debe estar entre 1 y 50.',
        campo: 'tamanoPagina',
      });
    }

    const offset = (pagina - 1) * tamanoPagina;
    if (!Number.isSafeInteger(offset)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'La página solicitada no puede representarse de forma segura.',
        campo: 'pagina',
      });
    }
    return offset;
  }
}
