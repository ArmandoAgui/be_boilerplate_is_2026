import { Module } from '@nestjs/common';
}
import { PaquetesController } from './controllers/paquetes.controller.js';
import { PaquetesRepository } from './repositories/paquetes.repository.js';
import { AvisosPaquete } from './services/avisos.service.js';
import { PaquetesService } from './services/paquetes.service.js';

@Module({
  controllers: [PaquetesController],
  providers: [PaquetesService, PaquetesRepository, AvisosPaquete],
})
export class PaquetesModule {}
