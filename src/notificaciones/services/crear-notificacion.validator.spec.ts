import { ModuloOrigen, TipoEvento } from '@PrismaClient';
import { describe, expect, it } from 'vitest';
import { NotificacionEntradaInvalidaError } from './notificaciones.errors.js';
import { validarCrearNotificacion } from './crear-notificacion.validator.js';

const usuarioId = '1ab0d5c8-365c-4a5c-bdbd-09ce7183620f';
const referenciaId = '6cbf93f1-8d6d-49c2-9fea-7192cf79f242';

function datos(overrides: Record<string, unknown> = {}) {
  return {
    destinatario: { tipo: 'USUARIO', id: usuarioId },
    tipoEvento: TipoEvento.INCIDENCIA_RESUELTA,
    titulo: 'Tu incidencia fue resuelta',
    mensaje: 'La incidencia fue resuelta.',
    moduloOrigen: ModuloOrigen.INCIDENCIAS,
    referenciaId,
    claveEvento: `INCIDENCIA_RESUELTA:${referenciaId}`,
    ...overrides,
  };
}

describe('validarCrearNotificacion', () => {
  it('conserva los datos válidos y normaliza una referencia omitida a null', () => {
    const input = datos({
      titulo: '  Aviso válido  ',
      referenciaId: undefined,
    });

    expect(validarCrearNotificacion(input)).toMatchObject({
      titulo: '  Aviso válido  ',
      referenciaId: null,
      destinatario: { tipo: 'USUARIO', id: usuarioId },
    });
  });

  it('acepta cada pareja válida de módulo y evento de Prisma', () => {
    const pares = [
      [ModuloOrigen.CUOTAS, TipoEvento.CUOTA_POR_VENCER],
      [ModuloOrigen.PAQUETERIA, TipoEvento.PAQUETE_RECIBIDO],
      [ModuloOrigen.COMUNICADOS, TipoEvento.COMUNICADO_NUEVO],
      [ModuloOrigen.ASAMBLEAS, TipoEvento.VOTACION_ABIERTA],
      [ModuloOrigen.INCIDENCIAS, TipoEvento.INCIDENCIA_RESUELTA],
    ] as const;

    for (const [moduloOrigen, tipoEvento] of pares) {
      expect(() =>
        validarCrearNotificacion(datos({ moduloOrigen, tipoEvento })),
      ).not.toThrow();
    }
  });

  it('acepta TODOS sin ID y rechaza formas de destinatario no válidas', () => {
    expect(
      validarCrearNotificacion(datos({ destinatario: { tipo: 'TODOS' } }))
        .destinatario,
    ).toEqual({ tipo: 'TODOS' });

    for (const destinatario of [
      { tipo: 'TODOS', id: usuarioId },
      { tipo: 'UNIDAD' },
      { tipo: 'UNIDAD', id: 'no-uuid' },
      { tipo: 'TORRE', id: usuarioId, extra: true },
      { tipo: 'ALGUIEN', id: usuarioId },
    ]) {
      expect(() =>
        validarCrearNotificacion(datos({ destinatario })),
      ).toThrowError(NotificacionEntradaInvalidaError);
    }
  });

  it('rechaza enums, parejas de evento y propiedades desconocidas', () => {
    for (const input of [
      datos({ moduloOrigen: 'OTRO' }),
      datos({ tipoEvento: 'OTRO' }),
      datos({ moduloOrigen: ModuloOrigen.COMUNICADOS }),
      datos({ inesperado: true }),
    ]) {
      expect(() => validarCrearNotificacion(input)).toThrowError(
        NotificacionEntradaInvalidaError,
      );
    }
  });

  it('aplica los límites de caracteres de Prisma, incluidos caracteres Unicode', () => {
    expect(() =>
      validarCrearNotificacion(
        datos({
          titulo: '🙂'.repeat(100),
          mensaje: '🙂'.repeat(300),
          claveEvento: '🙂'.repeat(120),
        }),
      ),
    ).not.toThrow();

    for (const input of [
      datos({ titulo: 'T'.repeat(101) }),
      datos({ mensaje: 'M'.repeat(301) }),
      datos({ claveEvento: 'K'.repeat(121) }),
    ]) {
      expect(() => validarCrearNotificacion(input)).toThrowError(
        NotificacionEntradaInvalidaError,
      );
    }
  });

  it('rechaza texto vacío, texto de espacios y referencias inválidas', () => {
    for (const input of [
      datos({ titulo: '' }),
      datos({ mensaje: '   ' }),
      datos({ claveEvento: '' }),
      datos({ referenciaId: 'no-uuid' }),
      datos({ referenciaId: 42 }),
    ]) {
      expect(() => validarCrearNotificacion(input)).toThrowError(
        NotificacionEntradaInvalidaError,
      );
    }
  });
});
