import { describe, expect, it } from 'vitest';
import { EstadoIncidencia } from '@PrismaClient';
import {
  EstadoIncidenciaDestinoInvalidoError,
  TransicionEstadoIncidenciaInvalidaError,
} from '../errors/incidencias.errors.js';
import { calcularTransicionEstadoIncidencia } from './estado-incidencia.rules.js';

describe('calcularTransicionEstadoIncidencia', () => {
  it.each([
    [EstadoIncidencia.ABIERTA, EstadoIncidencia.EN_PROCESO],
    [EstadoIncidencia.ABIERTA, EstadoIncidencia.RESUELTA],
    [EstadoIncidencia.ASIGNADA, EstadoIncidencia.RESUELTA],
    [EstadoIncidencia.EN_PROCESO, EstadoIncidencia.EN_PROCESO],
    [EstadoIncidencia.RESUELTA, EstadoIncidencia.EN_PROCESO],
    [EstadoIncidencia.RESUELTA, EstadoIncidencia.RESUELTA],
  ])('rechaza %s -> %s', (actual, destino) => {
    expect(() => calcularTransicionEstadoIncidencia(actual, destino)).toThrow(
      TransicionEstadoIncidenciaInvalidaError,
    );
  });

  it('permite ASIGNADA -> EN_PROCESO', () => {
    expect(
      calcularTransicionEstadoIncidencia(
        EstadoIncidencia.ASIGNADA,
        EstadoIncidencia.EN_PROCESO,
      ),
    ).toEqual({
      estadoEsperado: EstadoIncidencia.ASIGNADA,
      estadoDestino: EstadoIncidencia.EN_PROCESO,
    });
  });

  it('permite EN_PROCESO -> RESUELTA', () => {
    expect(
      calcularTransicionEstadoIncidencia(
        EstadoIncidencia.EN_PROCESO,
        EstadoIncidencia.RESUELTA,
      ),
    ).toEqual({
      estadoEsperado: EstadoIncidencia.EN_PROCESO,
      estadoDestino: EstadoIncidencia.RESUELTA,
    });
  });

  it.each([undefined, null, [], 'ABIERTA', 'asignada', ' RESUELTA']) (
    'rechaza destino inválido %s',
    (destino) => {
      expect(() =>
        calcularTransicionEstadoIncidencia(
          EstadoIncidencia.ASIGNADA,
          destino,
        ),
      ).toThrow(EstadoIncidenciaDestinoInvalidoError);
    },
  );
});
