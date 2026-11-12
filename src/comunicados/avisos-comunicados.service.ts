import { Inject, Injectable } from '@nestjs/common';
// Puerto local para mantener desacoplado el caso de uso de comunicados.
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
    @Inject(NOTIFICACIONES_COMUNICADOS)
    private readonly notificaciones: NotificadorComunicados,
  ) {}
  async crear(aviso: AvisoComunicado): Promise<void> {
    await this.notificaciones.crear(aviso);
  }
}
