import {
  CampoHistorial,
  EstadoIncidencia,
  Prioridad,
  Rol,
} from '@PrismaClient';
import { isUUID } from 'class-validator';
import {
  IncidenciaResueltaError,
  PrioridadIncidenciaNoValidaError,
  ResponsableIncidenciaNoValidoError,
  SolicitudAsignacionVaciaError,
} from '../errors/incidencias.errors.js';

export interface IncidenciaAsignacionActual {
  readonly prioridad: Prioridad | null;
  readonly responsableId: string | null;
  readonly estado: EstadoIncidencia;
}

export interface SolicitudCambiosAsignacion {
  readonly prioridad?: Prioridad;
  readonly responsableId?: string;
}

/** Proyección obtenida y validada dentro de la transacción de asignación. */
export interface CandidatoResponsableAsignacion {
  readonly id: string;
  readonly isActive: boolean;
  readonly rol: Rol;
}

export interface EntradaHistorialAsignacion {
  readonly campo: CampoHistorial;
  readonly valorAnterior: string | null;
  readonly valorNuevo: string;
  readonly actorId: string;
  readonly createdAt: Date;
}

export interface PlanAsignacionIncidencia {
  readonly prioridad: Prioridad | null;
  readonly responsableId: string | null;
  readonly estado: EstadoIncidencia;
  readonly historial: readonly EntradaHistorialAsignacion[];
  /** null indica que no se debe escribir updatedAt. */
  readonly updatedAt: Date | null;
}

export interface CalcularPlanAsignacionInput {
  readonly actual: IncidenciaAsignacionActual;
  readonly solicitud: SolicitudCambiosAsignacion;
  readonly responsableSolicitado?: CandidatoResponsableAsignacion | null;
  readonly actorId: string;
  readonly ahora: Date;
}

/** Calcula solo diferencias reales; no consulta ni modifica persistencia. */
export function calcularPlanAsignacion(
  input: CalcularPlanAsignacionInput,
): PlanAsignacionIncidencia {
  const { actual, solicitud, actorId, ahora } = input;
  const envioPrioridad = solicitud.prioridad !== undefined;
  const envioResponsable = solicitud.responsableId !== undefined;

  if (!envioPrioridad && !envioResponsable) {
    throw new SolicitudAsignacionVaciaError();
  }
  if (actual.estado === EstadoIncidencia.RESUELTA) {
    throw new IncidenciaResueltaError();
  }

  const prioridadSolicitada = solicitud.prioridad;
  if (
    envioPrioridad &&
    (typeof prioridadSolicitada !== 'string' ||
      !Object.values(Prioridad).includes(prioridadSolicitada as Prioridad))
  ) {
    throw new PrioridadIncidenciaNoValidaError();
  }

  if (envioResponsable) {
    const candidato = input.responsableSolicitado;
    if (
      !solicitud.responsableId ||
      !isUUID(solicitud.responsableId) ||
      !candidato ||
      candidato.id !== solicitud.responsableId ||
      !candidato.isActive ||
      (candidato.rol !== Rol.ADMINISTRADOR && candidato.rol !== Rol.SEGURIDAD)
    ) {
      throw new ResponsableIncidenciaNoValidoError();
    }
  }

  const historial: EntradaHistorialAsignacion[] = [];
  const prioridad = prioridadSolicitada ?? actual.prioridad;
  const responsableSolicitadoId = solicitud.responsableId;
  const responsableId = responsableSolicitadoId ?? actual.responsableId;
  let estado = actual.estado;

  if (
    prioridadSolicitada !== undefined &&
    prioridadSolicitada !== actual.prioridad
  ) {
    historial.push({
      campo: CampoHistorial.PRIORIDAD,
      valorAnterior: actual.prioridad,
      valorNuevo: prioridadSolicitada,
      actorId,
      createdAt: ahora,
    });
  }

  if (
    responsableSolicitadoId !== undefined &&
    responsableSolicitadoId !== actual.responsableId
  ) {
    historial.push({
      campo: CampoHistorial.RESPONSABLE,
      valorAnterior: actual.responsableId,
      valorNuevo: responsableSolicitadoId,
      actorId,
      createdAt: ahora,
    });

    if (actual.estado === EstadoIncidencia.ABIERTA) {
      estado = EstadoIncidencia.ASIGNADA;
      historial.push({
        campo: CampoHistorial.ESTADO,
        valorAnterior: EstadoIncidencia.ABIERTA,
        valorNuevo: EstadoIncidencia.ASIGNADA,
        actorId,
        createdAt: ahora,
      });
    }
  }

  return {
    prioridad,
    responsableId,
    estado,
    historial,
    updatedAt: historial.length > 0 ? ahora : null,
  };
}
