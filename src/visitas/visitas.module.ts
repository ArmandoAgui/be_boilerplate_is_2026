import { Module } from '@nestjs/common';
import { AutorizacionesController } from './controllers/visitas.controller.js';
import { VisitasRepository } from './repositories/visitas.repository.js';
import { VisitasService } from './services/visitas.service.js';

@Module({
  controllers: [AutorizacionesController],
  providers: [VisitasService, VisitasRepository],
})
export class VisitasModule {}
