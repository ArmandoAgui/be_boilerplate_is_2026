import { Module } from '@nestjs/common';
import {
  AutorizacionesController,
  EntradasController,
  PresentesController,
  UnidadesVisitaController,
} from './controllers/visitas.controller.js';
import { VisitasRepository } from './repositories/visitas.repository.js';
import { VisitasService } from './services/visitas.service.js';

@Module({
  controllers: [
    AutorizacionesController,
    EntradasController,
    PresentesController,
    UnidadesVisitaController,
  ],
  providers: [VisitasService, VisitasRepository],
})
export class VisitasModule {}
