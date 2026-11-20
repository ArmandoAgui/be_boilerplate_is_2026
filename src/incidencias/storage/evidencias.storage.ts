import { createReadStream, type ReadStream, type Stats } from 'node:fs';
import { lstat, mkdir, open, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import type { FotoIncidenciaValidada } from '../validators/fotos-incidencia.validator.js';

export interface EvidenciaArchivoAlmacenada {
  readonly ruta: string;
  readonly mime: FotoIncidenciaValidada['mimeType'];
  readonly tamanoBytes: number;
}

export interface FalloLimpiezaEvidencia {
  readonly nombre: string;
  readonly error: unknown;
}

/** Conserva la causa original y los archivos que requieren remediación. */
export class ErrorAlmacenamientoEvidencias extends Error {
  constructor(
    message: string,
    readonly causaOriginal: unknown,
    readonly archivosPendientes: readonly string[],
    readonly erroresLimpieza: readonly FalloLimpiezaEvidencia[] = [],
  ) {
    super(message, { cause: causaOriginal });
    this.name = 'ErrorAlmacenamientoEvidencias';
  }
}

/** Error interno que permite a la ruta privada responder sin revelar la ruta. */
export class ArchivoEvidenciaNoDisponibleError extends Error {
  constructor(cause?: unknown) {
    super('El archivo de evidencia no está disponible.', { cause });
    this.name = 'ArchivoEvidenciaNoDisponibleError';
  }
}

type EstadoLote = 'pendiente' | 'confirmado' | 'limpio' | 'limpieza_fallida';

/**
 * Representa exclusivamente los archivos escritos por una solicitud. El
 * servicio confirma el lote tras el commit o lo compensa si la transacción falla.
 */
export class LoteEvidenciasIncidencia {
  private estado: EstadoLote = 'pendiente';
  private limpiezaEnCurso: Promise<void> | null = null;

  constructor(
    readonly evidencias: readonly EvidenciaArchivoAlmacenada[],
    private readonly nombresPropios: string[],
    private readonly eliminar: (
      nombres: readonly string[],
    ) => Promise<FalloLimpiezaEvidencia[]>,
    private readonly logger: Logger,
  ) {}

  /** Impide que un error posterior al commit borre archivos ya confirmados. */
  confirmarPersistencia(): void {
    if (this.estado !== 'pendiente') {
      throw new Error('El lote de evidencias ya no está pendiente.');
    }
    this.estado = 'confirmado';
  }

  async compensar(causaOriginal: unknown): Promise<void> {
    if (this.estado === 'confirmado' || this.estado === 'limpio') return;
    if (this.limpiezaEnCurso) return this.limpiezaEnCurso;

    this.limpiezaEnCurso = this.ejecutarCompensacion(causaOriginal);
    try {
      await this.limpiezaEnCurso;
    } finally {
      this.limpiezaEnCurso = null;
    }
  }

  private async ejecutarCompensacion(causaOriginal: unknown): Promise<void> {
    const errores = await this.eliminar(this.nombresPropios);
    if (errores.length > 0) {
      this.estado = 'limpieza_fallida';
      const pendientes = errores.map(({ nombre }) => nombre);
      const primerError = errores[0]?.error;
      this.logger.error(
        `Falló la compensación de evidencias. ` +
          `Causa original: ${resumenError(causaOriginal)}. ` +
          `Archivos pendientes: ${pendientes.join(', ')}`,
        [causaOriginal, primerError]
          .filter((cause): cause is Error => cause instanceof Error)
          .map((cause) => cause.stack)
          .filter((stack): stack is string => Boolean(stack))
          .join('\n\n'),
      );
      throw new ErrorAlmacenamientoEvidencias(
        'No se pudieron limpiar todas las evidencias de la solicitud.',
        causaOriginal,
        pendientes,
        errores,
      );
    }

    this.estado = 'limpio';
    this.nombresPropios.length = 0;
  }
}

@Injectable()
export class EvidenciasStorage {
  private readonly logger = new Logger(EvidenciasStorage.name);
  private readonly directorio: string;

  constructor(config: ConfigService) {
    const uploadsDir = config.get<string>('UPLOADS_DIR')?.trim() || './uploads';
    this.directorio = resolve(process.cwd(), uploadsDir, 'incidencias');
  }

  async guardarLote(
    fotos: readonly FotoIncidenciaValidada[],
  ): Promise<LoteEvidenciasIncidencia> {
    const archivos: EvidenciaArchivoAlmacenada[] = [];
    const nombresPropios: string[] = [];

    try {
      if (fotos.length > 0) await mkdir(this.directorio, { recursive: true });

      for (const foto of fotos) {
        const nombre = `${randomUUID()}.${foto.extension}`;
        await this.escribirExclusivo(nombre, foto.buffer, nombresPropios);
        archivos.push({
          ruta: nombre,
          mime: foto.mimeType,
          tamanoBytes: foto.buffer.length,
        });
      }
    } catch (cause) {
      const erroresLimpieza = await this.eliminarNombresPropios(nombresPropios);
      const pendientes = erroresLimpieza.map(({ nombre }) => nombre);
      this.registrarFallo(
        'No se pudo almacenar el lote de evidencias.',
        cause,
        pendientes,
        erroresLimpieza,
      );
      throw new ErrorAlmacenamientoEvidencias(
        'No se pudieron almacenar las evidencias de la solicitud.',
        cause,
        pendientes,
        erroresLimpieza,
      );
    }

    return new LoteEvidenciasIncidencia(
      archivos,
      nombresPropios,
      (nombres) => this.eliminarNombresPropios(nombres),
      this.logger,
    );
  }

  /** Abre únicamente nombres UUID creados por H9; el stream cierra su descriptor al terminar. */
  async abrirLectura(nombreInterno: string): Promise<ReadStream> {
    let ruta: string;
    try {
      ruta = this.rutaSegura(nombreInterno);
    } catch (cause) {
      throw new ArchivoEvidenciaNoDisponibleError(cause);
    }

    let informacion: Stats;
    try {
      informacion = await lstat(ruta);
    } catch (cause) {
      if (esErrorDeSistema(cause) && cause.code === 'ENOENT') {
        throw new ArchivoEvidenciaNoDisponibleError(cause);
      }
      throw new ErrorAlmacenamientoEvidencias(
        'No se pudo consultar el archivo de evidencia.',
        cause,
        [],
      );
    }

    if (!informacion.isFile()) {
      throw new ArchivoEvidenciaNoDisponibleError(
        new Error('El destino no es un archivo regular.'),
      );
    }

    try {
      return createReadStream(ruta, { flags: 'r', autoClose: true });
    } catch (cause) {
      throw new ErrorAlmacenamientoEvidencias(
        'No se pudo abrir el archivo de evidencia.',
        cause,
        [],
      );
    }
  }

  private async escribirExclusivo(
    nombre: string,
    buffer: Buffer,
    nombresPropios: string[],
  ): Promise<void> {
    const ruta = this.rutaSegura(nombre);
    const archivo = await open(ruta, 'wx', 0o600);
    // Desde que open('wx') tiene éxito, el archivo es propiedad de esta operación,
    // incluso si writeFile solo alcanza a escribir una parte del buffer.
    nombresPropios.push(nombre);

    let ocurrioError = false;
    let errorOriginal: unknown;
    try {
      await archivo.writeFile(buffer);
    } catch (error) {
      ocurrioError = true;
      errorOriginal = error;
    }

    let ocurrioErrorDeCierre = false;
    let errorDeCierre: unknown;
    try {
      await archivo.close();
    } catch (error) {
      ocurrioErrorDeCierre = true;
      errorDeCierre = error;
      try {
        await archivo.close();
      } catch (errorAlReintentar) {
        errorDeCierre = new AggregateError(
          [errorDeCierre, errorAlReintentar],
          'Falló el cierre del descriptor en dos intentos.',
        );
      }
    }

    if (ocurrioError) {
      if (ocurrioErrorDeCierre) {
        throw new AggregateError(
          [errorOriginal, errorDeCierre],
          'Falló la escritura y el cierre del archivo.',
        );
      }
      throw errorOriginal;
    }
    if (ocurrioErrorDeCierre) throw errorDeCierre;
  }

  private async eliminarNombresPropios(
    nombres: readonly string[],
  ): Promise<FalloLimpiezaEvidencia[]> {
    const errores: FalloLimpiezaEvidencia[] = [];

    for (const nombre of nombres) {
      try {
        await unlink(this.rutaSegura(nombre));
      } catch (error) {
        if (esErrorDeSistema(error) && error.code === 'ENOENT') continue;
        errores.push({ nombre, error });
      }
    }

    return errores;
  }

  private rutaSegura(nombreInterno: string): string {
    const nombreValido =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/.test(
        nombreInterno,
      );
    if (!nombreValido) {
      throw new Error('Nombre interno de evidencia inválido.');
    }
    return resolve(this.directorio, nombreInterno);
  }

  private registrarFallo(
    mensaje: string,
    causa: unknown,
    pendientes: readonly string[],
    erroresLimpieza: readonly FalloLimpiezaEvidencia[],
  ): void {
    const causaLog = erroresLimpieza[0]?.error ?? causa;
    const stack = causaLog instanceof Error ? causaLog.stack : undefined;
    this.logger.error(
      `${mensaje} Causa: ${resumenError(causa)}. ` +
        `Archivos pendientes: ${pendientes.length > 0 ? pendientes.join(', ') : 'ninguno'}. ` +
        `Fallos de limpieza: ${erroresLimpieza.length}.`,
      stack,
    );
  }
}

function esErrorDeSistema(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function resumenError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
