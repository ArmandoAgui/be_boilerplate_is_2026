export type IncidenciaUserRole = 'RESIDENTE' | 'ADMINISTRADOR' | 'SEGURIDAD';

export interface ActorIncidenciaLectura {
  readonly id: string;
  readonly rol: string;
}

export interface AlcanceIncidenciaLectura {
  readonly residenteId: string;
  readonly responsableId: string | null;
}

/** Autoriza por autoría, rol administrador o asignación vigente de Seguridad. */
export function puedeLeerIncidencia(
  actor: ActorIncidenciaLectura,
  incidencia: AlcanceIncidenciaLectura,
): boolean {
  return (
    actor.rol === 'ADMINISTRADOR' ||
    (actor.rol === 'RESIDENTE' && actor.id === incidencia.residenteId) ||
    (actor.rol === 'SEGURIDAD' && actor.id === incidencia.responsableId)
  );
}
