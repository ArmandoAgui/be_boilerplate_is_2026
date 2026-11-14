export interface IncidenciaResueltaDatosPersistidos {
  readonly id: string;
  readonly codigo: string;
  readonly residenteId: string;
}

export interface IncidenciaResueltaPayload {
  readonly destinatario: {
    readonly tipo: 'USUARIO';
    readonly id: string;
  };
  readonly tipoEvento: 'INCIDENCIA_RESUELTA';
  readonly titulo: 'Tu incidencia fue resuelta';
  readonly mensaje: string;
  readonly moduloOrigen: 'INCIDENCIAS';
  readonly referenciaId: string;
  readonly claveEvento: string;
}

export function crearIncidenciaResueltaPayload(
  incidencia: IncidenciaResueltaDatosPersistidos,
): IncidenciaResueltaPayload {
  return {
    destinatario: { tipo: 'USUARIO', id: incidencia.residenteId },
    tipoEvento: 'INCIDENCIA_RESUELTA',
    titulo: 'Tu incidencia fue resuelta',
    mensaje: `Tu incidencia ${incidencia.codigo} fue resuelta.`,
    moduloOrigen: 'INCIDENCIAS',
    referenciaId: incidencia.id,
    claveEvento: `INCIDENCIA_RESUELTA:${incidencia.id}`,
  };
}
