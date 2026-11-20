import { EstadoIncidencia } from '@PrismaClient';
import {
  EstadoIncidenciaDestinoInvalidoError,
  TransicionEstadoIncidenciaInvalidaError,
} from '../errors/incidencias.errors.js';

export const ESTADOS_DESTINO_H11 = [
  EstadoIncidencia.EN_PROCESO,
  EstadoIncidencia.RESUELTA,
] as const;

export type EstadoIncidenciaDestino = (typeof ESTADOS_DESTINO_H11)[number];

export interface TransicionEstadoIncidencia {
  readonly estadoEsperado: EstadoIncidencia;
  readonly estadoDestino: EstadoIncidenciaDestino;
}

const ESTADO_ORIGEN_POR_DESTINO: Record<
  EstadoIncidenciaDestino,
  EstadoIncidencia
> = {
  [EstadoIncidencia.EN_PROCESO]: EstadoIncidencia.ASIGNADA,
  [EstadoIncidencia.RESUELTA]: EstadoIncidencia.EN_PROCESO,
};

const ETIQUETA_ESTADO: Record<EstadoIncidencia, string> = {
  [EstadoIncidencia.ABIERTA]: 'Abierta',
  [EstadoIncidencia.ASIGNADA]: 'Asignada',
  [EstadoIncidencia.EN_PROCESO]: 'En proceso',
  [EstadoIncidencia.RESUELTA]: 'Resuelta',
};

export function calcularTransicionEstadoIncidencia(
  estadoActual: EstadoIncidencia,
  estadoDestino: unknown,
): TransicionEstadoIncidencia {
  if (
    typeof estadoDestino !== 'string' ||
    !ESTADOS_DESTINO_H11.includes(estadoDestino as EstadoIncidenciaDestino)
  ) {
    throw new EstadoIncidenciaDestinoInvalidoError();
  }

  const destino = estadoDestino as EstadoIncidenciaDestino;
  const estadoEsperado = ESTADO_ORIGEN_POR_DESTINO[destino];
  if (estadoActual !== estadoEsperado) {
    throw new TransicionEstadoIncidenciaInvalidaError(
      `El estado no se puede cambiar desde ${ETIQUETA_ESTADO[estadoActual]}`,
    );
  }

  return { estadoEsperado, estadoDestino: destino };
}
