import { Inject, Injectable, Optional } from '@nestjs/common';
// Puerto local: conectar useExisting al servicio de H28 cuando se integre.
export const NOTIFICACIONES_COMUNICADOS = Symbol('NOTIFICACIONES_COMUNICADOS');
export type AvisoComunicado = {
  destinatario: { tipo: 'TODOS' | 'TORRE' | 'SECCION'; id?: string };
  tipoEvento: 'COMUNICADO_NUEVO';
  titulo: string;
  mensaje: string;
  moduloOrigen: 'COMUNICADOS';
  referenciaId: string;
  claveEvento: string;
};
export interface NotificadorComunicados {
  crear(aviso: AvisoComunicado): Promise<unknown>;
}
@Injectable()
export class AvisosComunicados {
  constructor(
    @Optional()
    @Inject(NOTIFICACIONES_COMUNICADOS)
    private readonly notificaciones?: NotificadorComunicados,
  ) {}
  async crear(aviso: AvisoComunicado): Promise<void> {
    if (!this.notificaciones)
      throw new Error('Pendiente integrar NotificacionesService de H28');
    await this.notificaciones.crear(aviso);
  }
}
