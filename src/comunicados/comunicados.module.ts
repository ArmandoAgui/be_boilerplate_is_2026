import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { NotificacionesService } from '../notificaciones/services/notificaciones.service.js';
import {
  ComunicadosController,
  TorresComunicadosController,
} from './comunicados.controller.js';
import { ComunicadosService } from './comunicados.service.js';
import { ComunicadosRepository } from './comunicados.repository.js';
import {
  AvisosComunicados,
  NOTIFICACIONES_COMUNICADOS,
} from './avisos-comunicados.service.js';
@Module({
  imports: [NotificacionesModule],
  controllers: [ComunicadosController, TorresComunicadosController],
  providers: [
    ComunicadosService,
    ComunicadosRepository,
    AvisosComunicados,
    {
      provide: NOTIFICACIONES_COMUNICADOS,
      useExisting: NotificacionesService,
    },
  ],
})
export class ComunicadosModule {}
