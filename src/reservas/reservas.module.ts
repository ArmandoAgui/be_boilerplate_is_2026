import { Module } from '@nestjs/common';
import {
  AreasController,
  ReservasController,
  UnidadesReservaController,
} from './controllers/reservas.controller.js';
import { ReservasService } from './services/reservas.service.js';
import { ReservasRepository } from './repositories/reservas.repository.js';
@Module({
  controllers: [AreasController, ReservasController, UnidadesReservaController],
  providers: [ReservasService, ReservasRepository],
})
export class ReservasModule {}
