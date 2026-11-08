import { Module } from '@nestjs/common';

import { AsambleasController } from './controllers/asambleas.controller.js';
import { AsambleasRepository } from './repositories/asambleas.repository.js';
import { AsambleasService } from './services/asambleas.service.js';

import { AbrirVotacionesJob } from './jobs/abrir-votaciones.job.js';

import {
  NOTIFICACIONES_PORT,
} from './notificaciones/notificaciones.port.js';

import {
  NotificacionesPlaceholder,
} from './notificaciones/notificaciones.placeholder.js';

@Module({
  controllers: [AsambleasController],

  providers: [
    AsambleasRepository,
    AsambleasService,
    AbrirVotacionesJob,

    {
      provide: NOTIFICACIONES_PORT,
      useClass: NotificacionesPlaceholder,
    },
  ],

  exports: [
    AsambleasRepository,
  ],
})
export class AsambleasModule {}
