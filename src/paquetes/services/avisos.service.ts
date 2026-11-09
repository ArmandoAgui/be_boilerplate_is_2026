import { Injectable, Logger } from '@nestjs/common';

export type AvisoPaqueteRecibido = {
  paqueteId: string;
  codigo: string;
  unidadId: string;
  empresa: string;
};

/**
 * Hueco para H28 (Guillermo). La tarjeta de H16 manda llamar a
 * `NotificacionesService.crear` con el evento PAQUETE_RECIBIDO después del
 * commit, y que un fallo del aviso no deshaga el registro del paquete.
 *
 * Mientras ese servicio no exista, esto marca el punto exacto donde se va a
 * conectar sin inventar el contrato de otro módulo. Vive dentro de paquetería
 * y no en un lugar compartido justamente para no chocar con H28 cuando llegue:
 * al integrarla se borra este archivo y se inyecta el servicio real.
 */
@Injectable()
export class AvisosPaquete {
  private readonly log = new Logger(AvisosPaquete.name);

  paqueteRecibido(aviso: AvisoPaqueteRecibido): Promise<void> {
    this.log.log(
      `Pendiente H28: avisar PAQUETE_RECIBIDO del paquete ${aviso.codigo} a la unidad ${aviso.unidadId}`,
    );
    return Promise.resolve();
  }
}
