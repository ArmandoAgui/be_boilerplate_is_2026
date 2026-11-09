import { BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

export const TAMANO_MAXIMO_FOTO_INCIDENCIA = 5_242_880;
export const CANTIDAD_MAXIMA_FOTOS_INCIDENCIA = 3;
export const MENSAJE_FOTOS_INCIDENCIA_INVALIDAS =
  'Solo se permiten JPG o PNG de hasta 5 MB';

export type MimeFotoIncidencia = 'image/jpeg' | 'image/png';
export type ExtensionFotoIncidencia = 'jpg' | 'png';

export interface FotoIncidenciaValidada {
  readonly buffer: Buffer;
  readonly mimeType: MimeFotoIncidencia;
  readonly extension: ExtensionFotoIncidencia;
  readonly sizeBytes: number;
}

const FORMATOS_ADMITIDOS: Readonly<Record<string, MimeFotoIncidencia>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
};

/**
 * Valida el lote entero antes de entregarlo al servicio que escribirá evidencias.
 * No confía en el nombre, extensión ni MIME reportados por el cliente.
 */
export async function validarFotosIncidencia(
  archivos: readonly Express.Multer.File[] | undefined,
): Promise<FotoIncidenciaValidada[]> {
  if (archivos === undefined || archivos.length === 0) return [];

  if (archivos.length > CANTIDAD_MAXIMA_FOTOS_INCIDENCIA) {
    throw errorFotosInvalidas(
      `Se permite un máximo de ${CANTIDAD_MAXIMA_FOTOS_INCIDENCIA} fotos.`,
    );
  }

  const validadas: FotoIncidenciaValidada[] = [];

  for (const archivo of archivos) {
    validadas.push(await validarFotoIncidencia(archivo));
  }

  return validadas;
}

async function validarFotoIncidencia(
  archivo: Express.Multer.File,
): Promise<FotoIncidenciaValidada> {
  if (
    archivo.fieldname !== 'fotos' ||
    !Buffer.isBuffer(archivo.buffer) ||
    archivo.buffer.length === 0 ||
    archivo.buffer.length > TAMANO_MAXIMO_FOTO_INCIDENCIA
  ) {
    throw errorFotosInvalidas();
  }

  const tipoDetectado = await fileTypeFromBuffer(archivo.buffer);
  const mimeType = tipoDetectado
    ? FORMATOS_ADMITIDOS[tipoDetectado.ext]
    : undefined;

  if (!tipoDetectado || !mimeType || tipoDetectado.mime !== mimeType) {
    throw errorFotosInvalidas();
  }

  try {
    // El límite es una protección técnica frente a imágenes comprimidas que
    // expanden a dimensiones desproporcionadas; no cambia los bytes aceptados.
    const opcionesDecoder = {
      failOn: 'warning',
      limitInputPixels: 40_000_000,
    } as const;
    const metadata = await sharp(archivo.buffer, opcionesDecoder).metadata();
    const formatoEsperado = mimeType === 'image/jpeg' ? 'jpeg' : 'png';

    if (metadata.format !== formatoEsperado) throw new Error('Formato distinto.');

    // stats() necesita acceder a los píxeles y fuerza la decodificación del
    // contenido, a diferencia de metadata(), que solo lee la cabecera.
    await sharp(archivo.buffer, opcionesDecoder).stats();
  } catch {
    throw errorFotosInvalidas();
  }

  return {
    buffer: archivo.buffer,
    mimeType,
    extension: tipoDetectado.ext as ExtensionFotoIncidencia,
    sizeBytes: archivo.buffer.length,
  };
}

function errorFotosInvalidas(message = MENSAJE_FOTOS_INCIDENCIA_INVALIDAS) {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message,
    campo: 'fotos',
  });
}
