import {
  CampoHistorial,
  EstadoIncidencia,
  Prioridad,
  Rol,
} from '@PrismaClient';
import { describe, expect, it } from 'vitest';
import {
  IncidenciaResueltaError,
  PrioridadIncidenciaNoValidaError,
  ResponsableIncidenciaNoValidoError,
  SolicitudAsignacionVaciaError,
} from '../errors/incidencias.errors.js';
import {
  calcularPlanAsignacion,
  type CalcularPlanAsignacionInput,
} from './asignacion-incidencia.rules.js';

const ids = {
  actor: '52fa5ec0-7465-4298-b6d4-940427bd6871',
  responsableActual: 'a21558bd-986a-4310-9b34-6388570f1dbd',
  responsableNuevo: 'e8cd3675-ff02-4974-a98c-d942bddcf041',
};
const ahora = new Date('2026-11-08T12:34:56.000Z');
const candidato = {
  id: ids.responsableNuevo,
  isActive: true,
  rol: Rol.SEGURIDAD,
};

function plan(
  cambios: Partial<CalcularPlanAsignacionInput> = {},
): ReturnType<typeof calcularPlanAsignacion> {
  return calcularPlanAsignacion({
    actual: {
      prioridad: null,
      responsableId: null,
      estado: EstadoIncidencia.ABIERTA,
    },
    solicitud: { prioridad: Prioridad.ALTA },
    actorId: ids.actor,
    ahora,
    ...cambios,
  });
}

describe('calcularPlanAsignacion', () => {
  it.each(Object.values(Prioridad))(
    'acepta la prioridad %s y mantiene ABIERTA si no hay asignación',
    (prioridad) => {
      const resultado = plan({ solicitud: { prioridad } });

      expect(resultado).toMatchObject({
        prioridad,
        responsableId: null,
        estado: EstadoIncidencia.ABIERTA,
        updatedAt: ahora,
      });
      expect(resultado.historial).toEqual([
        {
          campo: CampoHistorial.PRIORIDAD,
          valorAnterior: null,
          valorNuevo: prioridad,
          actorId: ids.actor,
          createdAt: ahora,
        },
      ]);
    },
  );

  it('asigna desde ABIERTA y conserva la prioridad null', () => {
    const resultado = plan({
      solicitud: { responsableId: ids.responsableNuevo },
      responsableSolicitado: candidato,
    });

    expect(resultado).toMatchObject({
      prioridad: null,
      responsableId: ids.responsableNuevo,
      estado: EstadoIncidencia.ASIGNADA,
      updatedAt: ahora,
    });
    expect(resultado.historial.map((entrada) => entrada.campo)).toEqual([
      CampoHistorial.RESPONSABLE,
      CampoHistorial.ESTADO,
    ]);
    expect(resultado.historial).toMatchObject([
      { valorAnterior: null, valorNuevo: ids.responsableNuevo },
      {
        valorAnterior: EstadoIncidencia.ABIERTA,
        valorNuevo: EstadoIncidencia.ASIGNADA,
      },
    ]);
  });

  it('ordena el historial PRIORIDAD, RESPONSABLE y ESTADO al cambiar ambos', () => {
    const resultado = plan({
      solicitud: {
        prioridad: Prioridad.URGENTE,
        responsableId: ids.responsableNuevo,
      },
      responsableSolicitado: candidato,
    });

    expect(resultado.historial.map((entrada) => entrada.campo)).toEqual([
      CampoHistorial.PRIORIDAD,
      CampoHistorial.RESPONSABLE,
      CampoHistorial.ESTADO,
    ]);
    expect(
      resultado.historial.every((entrada) => entrada.createdAt === ahora),
    ).toBe(true);
    expect(
      resultado.historial.every((entrada) => entrada.actorId === ids.actor),
    ).toBe(true);
  });

  it.each([EstadoIncidencia.ASIGNADA, EstadoIncidencia.EN_PROCESO])(
    'conserva el estado %s al cambiar prioridad y responsable',
    (estado) => {
      const resultado = plan({
        actual: {
          prioridad: Prioridad.MEDIA,
          responsableId: ids.responsableActual,
          estado,
        },
        solicitud: {
          prioridad: Prioridad.ALTA,
          responsableId: ids.responsableNuevo,
        },
        responsableSolicitado: candidato,
      });

      expect(resultado.estado).toBe(estado);
      expect(resultado.historial.map((entrada) => entrada.campo)).toEqual([
        CampoHistorial.PRIORIDAD,
        CampoHistorial.RESPONSABLE,
      ]);
    },
  );

  it('no crea historial ni actualiza updatedAt si los valores ya coinciden', () => {
    const resultado = plan({
      actual: {
        prioridad: Prioridad.ALTA,
        responsableId: ids.responsableNuevo,
        estado: EstadoIncidencia.ASIGNADA,
      },
      solicitud: {
        prioridad: Prioridad.ALTA,
        responsableId: ids.responsableNuevo,
      },
      responsableSolicitado: candidato,
    });

    expect(resultado.historial).toEqual([]);
    expect(resultado.updatedAt).toBeNull();
    expect(resultado.estado).toBe(EstadoIncidencia.ASIGNADA);
  });

  it('exige candidato elegible incluso al reenviar el responsable actual', () => {
    expect(() =>
      plan({
        actual: {
          prioridad: null,
          responsableId: ids.responsableNuevo,
          estado: EstadoIncidencia.ASIGNADA,
        },
        solicitud: { responsableId: ids.responsableNuevo },
        responsableSolicitado: { ...candidato, isActive: false },
      }),
    ).toThrow(ResponsableIncidenciaNoValidoError);
  });

  it('rechaza solicitudes vacías y toda modificación de RESUELTA', () => {
    expect(() => plan({ solicitud: {} })).toThrow(
      SolicitudAsignacionVaciaError,
    );
    expect(() =>
      plan({
        actual: {
          prioridad: Prioridad.ALTA,
          responsableId: ids.responsableActual,
          estado: EstadoIncidencia.RESUELTA,
        },
        solicitud: { prioridad: Prioridad.ALTA },
      }),
    ).toThrow(IncidenciaResueltaError);
  });

  it('rechaza prioridad null, UUID inválido y candidato con rol incorrecto', () => {
    expect(() => plan({ solicitud: { prioridad: null as never } })).toThrow(
      PrioridadIncidenciaNoValidaError,
    );
    expect(() => plan({ solicitud: { responsableId: 'invalido' } })).toThrow(
      ResponsableIncidenciaNoValidoError,
    );
    expect(() =>
      plan({
        solicitud: { responsableId: ids.responsableNuevo },
        responsableSolicitado: { ...candidato, rol: Rol.RESIDENTE },
      }),
    ).toThrow(ResponsableIncidenciaNoValidoError);
  });
});
