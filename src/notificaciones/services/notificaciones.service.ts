import { Injectable } from '@nestjs/common';
import type {
  CrearNotificacionInput,
  CrearNotificacionResult,
} from './notificaciones.types.js';
import { NotificacionesRepository } from '../repositories/notificaciones.repository.js';
import { validarCrearNotificacion } from './crear-notificacion.validator.js';

/** Proveedor interno para que los módulos creen avisos desde sus casos de uso. */
@Injectable()
export class NotificacionesService {
  constructor(private readonly repository: NotificacionesRepository) {}

  crear(datos: CrearNotificacionInput): Promise<CrearNotificacionResult> {
    const entrada = validarCrearNotificacion(datos);
    return this.repository.crear(entrada);
  }

  crearAvisoVotacionAbierta(
    temaId: string,
    ahora: Date,
  ): Promise<CrearNotificacionResult> {
    return this.repository.crearAvisoVotacionAbierta(temaId, ahora);
  }
}
