import type { IncidenciaResueltaPayload } from './incidencia-resuelta.payload.js';

/** Token local que adapta el proveedor compartido de H28 al módulo de Incidencias. */
export const H28_NOTIFICACIONES_PORT = Symbol('H28_NOTIFICACIONES_PORT');

export interface H28NotificacionesPort {
  crear(
    payload: IncidenciaResueltaPayload,
  ): Promise<{ readonly creadas: number }>;
}
