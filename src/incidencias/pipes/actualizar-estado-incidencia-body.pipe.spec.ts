import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { EstadoIncidencia } from '@PrismaClient';
import { ActualizarEstadoIncidenciaBodyPipe } from './actualizar-estado-incidencia-body.pipe.js';

describe('ActualizarEstadoIncidenciaBodyPipe', () => {
  const pipe = new ActualizarEstadoIncidenciaBodyPipe();

  it.each([
    null,
    undefined,
    [],
    'EN_PROCESO',
    1,
  ])('rechaza un body que no es objeto: %s', async (body) => {
    await expect(pipe.transform(body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    {},
    { estado: null },
    { estado: 1 },
    { estado: 'ABIERTA' },
    { estado: 'asignada' },
    { estado: ' RESUELTA' },
    { estado: 'EN_PROCESO', actorId: '52fa5ec0-7465-4298-b6d4-940427bd6871' },
  ])('rechaza un body inválido: %s', async (body) => {
    await expect(pipe.transform(body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([EstadoIncidencia.EN_PROCESO, EstadoIncidencia.RESUELTA])(
    'acepta el destino permitido %s sin normalizarlo',
    async (estado) => {
      await expect(pipe.transform({ estado })).resolves.toMatchObject({
        estado,
      });
    },
  );
});
