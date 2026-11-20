import { PaquetesController as LecturaController } from './paquetes.controller.js';
import { PaquetesService as LecturaService } from './paquetes.service.js';
import { PaquetesRepository as LecturaRepository } from './paquetes.repository.js';
import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { PaquetesController } from './controllers/paquetes.controller.js';
import { PaquetesRepository } from './repositories/paquetes.repository.js';
import { PaquetesService } from './services/paquetes.service.js';

@Module({
  imports: [NotificacionesModule],
  controllers: [PaquetesController, LecturaController],
  providers: [
    PaquetesService,
    PaquetesRepository,
    LecturaService,
    LecturaRepository,
  ],
})
export class PaquetesModule {}
