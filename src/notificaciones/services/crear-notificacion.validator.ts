import { isUUID } from 'class-validator';
import { ModuloOrigen, TipoEvento } from '@PrismaClient';
import type {
  CrearNotificacionContenido,
  CrearNotificacionInput,
  DestinatarioNotificacion,
} from './notificaciones.types.js';
import { NotificacionEntradaInvalidaError } from './notificaciones.errors.js';

const MODULO_POR_EVENTO: Record<TipoEvento, ModuloOrigen> = {
  [TipoEvento.CUOTA_POR_VENCER]: ModuloOrigen.CUOTAS,
  [TipoEvento.PAQUETE_RECIBIDO]: ModuloOrigen.PAQUETERIA,
  [TipoEvento.COMUNICADO_NUEVO]: ModuloOrigen.COMUNICADOS,
  [TipoEvento.VOTACION_ABIERTA]: ModuloOrigen.ASAMBLEAS,
  [TipoEvento.INCIDENCIA_RESUELTA]: ModuloOrigen.INCIDENCIAS,
};

const CAMPOS_ENTRADA = new Set([
  'destinatario',
  'tipoEvento',
  'titulo',
  'mensaje',
  'moduloOrigen',
  'referenciaId',
  'claveEvento',
]);

type Registro = Record<string, unknown>;

/** Valida también llamadas internas, que no pasan por el ValidationPipe HTTP. */
export function validarCrearNotificacion(
  valor: unknown,
): CrearNotificacionInput {
  const entrada = exigirRegistro(valor, 'datos');

  for (const campo of Object.keys(entrada)) {
    if (!CAMPOS_ENTRADA.has(campo)) {
      throw new NotificacionEntradaInvalidaError(
        `El campo ${campo} no está permitido.`,
        campo,
      );
    }
  }

  const destinatario = validarDestinatario(entrada.destinatario);
  const contenido = validarContenidoNotificacion({
    tipoEvento: entrada.tipoEvento,
    titulo: entrada.titulo,
    mensaje: entrada.mensaje,
    moduloOrigen: entrada.moduloOrigen,
    referenciaId: entrada.referenciaId,
    claveEvento: entrada.claveEvento,
  });

  return { ...contenido, destinatario };
}

/** Valida contenido compartido cuando una tarea resuelve la audiencia aparte. */
export function validarContenidoNotificacion(
  valor: unknown,
): CrearNotificacionContenido {
  const entrada = exigirRegistro(valor, 'datos');
  const camposPermitidos = new Set([
    'tipoEvento',
    'titulo',
    'mensaje',
    'moduloOrigen',
    'referenciaId',
    'claveEvento',
  ]);

  for (const campo of Object.keys(entrada)) {
    if (!camposPermitidos.has(campo)) {
      throw new NotificacionEntradaInvalidaError(
        `El campo ${campo} no está permitido.`,
        campo,
      );
    }
  }

  const tipoEvento = validarEnum(entrada.tipoEvento, TipoEvento, 'tipoEvento');
  const moduloOrigen = validarEnum(
    entrada.moduloOrigen,
    ModuloOrigen,
    'moduloOrigen',
  );

  if (MODULO_POR_EVENTO[tipoEvento] !== moduloOrigen) {
    throw new NotificacionEntradaInvalidaError(
      'El módulo de origen no corresponde al tipo de evento.',
      'moduloOrigen',
    );
  }

  const titulo = validarTexto(entrada.titulo, 100, 'titulo');
  const mensaje = validarTexto(entrada.mensaje, 300, 'mensaje');
  const claveEvento = validarTexto(entrada.claveEvento, 120, 'claveEvento');
  const referenciaId = validarReferencia(entrada.referenciaId);

  return {
    tipoEvento,
    titulo,
    mensaje,
    moduloOrigen,
    referenciaId,
    claveEvento,
  };
}

function validarDestinatario(valor: unknown): DestinatarioNotificacion {
  const destinatario = exigirRegistro(valor, 'destinatario');
  const tipo = destinatario.tipo;

  if (tipo === 'TODOS') {
    exigirCamposDestinatario(destinatario, ['tipo']);
    return { tipo };
  }

  if (
    tipo !== 'USUARIO' &&
    tipo !== 'UNIDAD' &&
    tipo !== 'TORRE' &&
    tipo !== 'SECCION'
  ) {
    throw new NotificacionEntradaInvalidaError(
      'El tipo de destinatario no es válido.',
      'destinatario.tipo',
    );
  }

  exigirCamposDestinatario(destinatario, ['tipo', 'id']);

  if (typeof destinatario.id !== 'string' || !isUUID(destinatario.id, 'all')) {
    throw new NotificacionEntradaInvalidaError(
      'El destinatario requiere un UUID válido.',
      'destinatario.id',
    );
  }

  return { tipo, id: destinatario.id };
}

function exigirCamposDestinatario(
  destinatario: Registro,
  permitidos: string[],
): void {
  const campos = Object.keys(destinatario);
  if (
    campos.length !== permitidos.length ||
    campos.some((campo) => !permitidos.includes(campo))
  ) {
    throw new NotificacionEntradaInvalidaError(
      'La forma del destinatario no es válida.',
      'destinatario',
    );
  }
}

function validarEnum<T extends Record<string, string>>(
  valor: unknown,
  catalogo: T,
  campo: string,
): T[keyof T] {
  if (typeof valor !== 'string' || !Object.values(catalogo).includes(valor)) {
    throw new NotificacionEntradaInvalidaError(
      `${campo} no pertenece al catálogo permitido.`,
      campo,
    );
  }

  return valor as T[keyof T];
}

function validarTexto(valor: unknown, maximo: number, campo: string): string {
  if (typeof valor !== 'string' || valor.trim().length === 0) {
    throw new NotificacionEntradaInvalidaError(
      `${campo} es obligatorio y no puede contener solo espacios.`,
      campo,
    );
  }

  if (Array.from(valor).length > maximo) {
    throw new NotificacionEntradaInvalidaError(
      `${campo} no puede superar ${maximo} caracteres.`,
      campo,
    );
  }

  return valor;
}

function validarReferencia(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;

  if (typeof valor !== 'string' || !isUUID(valor, 'all')) {
    throw new NotificacionEntradaInvalidaError(
      'referenciaId debe ser un UUID válido o null.',
      'referenciaId',
    );
  }

  return valor;
}

function exigirRegistro(valor: unknown, campo: string): Registro {
  if (
    typeof valor !== 'object' ||
    valor === null ||
    Array.isArray(valor) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(valor))
  ) {
    throw new NotificacionEntradaInvalidaError(
      `${campo} debe ser un objeto.`,
      campo,
    );
  }

  return valor as Registro;
}
