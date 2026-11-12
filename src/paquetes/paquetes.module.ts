import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { PaquetesController } from './controllers/paquetes.controller.js';
import { PaquetesRepository } from './repositories/paquetes.repository.js';
import { PaquetesService } from './services/paquetes.service.js';

@Module({
  imports: [NotificacionesModule],
  controllers: [PaquetesController],
  providers: [PaquetesService, PaquetesRepository],
})
export class PaquetesModule {}
