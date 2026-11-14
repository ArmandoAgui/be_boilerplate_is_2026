import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { AsambleasController } from './asambleas.controller.js';
import { AsambleasService } from './asambleas.service.js';
import { AsambleasRepository } from './asambleas.repository.js';
import { AbrirVotacionesJob } from './abrir-votaciones.job.js';

@Module({
  imports: [NotificacionesModule],
  controllers: [AsambleasController],
  providers: [AsambleasService, AsambleasRepository, AbrirVotacionesJob],
})
export class AsambleasModule {}
