import { Injectable, NotFoundException, type PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { NOTIFICACION_NO_ENCONTRADA } from '../notificaciones.constants.js';

/** UUID inválido comparte la misma respuesta 404 que un aviso ajeno o ausente. */
@Injectable()
export class NotificacionIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUUID(value, 'all')) {
      throw new NotFoundException(NOTIFICACION_NO_ENCONTRADA);
    }

    return value;
  }
}
