import type { ModuloOrigen, TipoEvento } from '@PrismaClient';

export type DestinatarioNotificacion =
  | { tipo: 'USUARIO'; id: string }
  | { tipo: 'UNIDAD'; id: string }
  | { tipo: 'TORRE'; id: string }
  | { tipo: 'SECCION'; id: string }
  | { tipo: 'TODOS' };

/** Campos de contenido que comparten el creador general y los disparadores internos. */
export interface CrearNotificacionContenido {
  tipoEvento: TipoEvento;
  titulo: string;
  mensaje: string;
  moduloOrigen: ModuloOrigen;
  referenciaId?: string | null;
  claveEvento: string;
}

/** Entrada para crear avisos desde módulos y tareas del backend. */
export interface CrearNotificacionInput extends CrearNotificacionContenido {
  destinatario: DestinatarioNotificacion;
}

export interface CrearNotificacionResult {
  creadas: number;
}
