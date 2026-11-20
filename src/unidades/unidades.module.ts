import { Module } from '@nestjs/common';
import { UnidadesController } from './controllers/unidades.controller.js';
import { UnidadesRepository } from './repositories/unidades.repository.js';
import { UnidadesService } from './services/unidades.service.js';

@Module({
  controllers: [UnidadesController],
  providers: [UnidadesService, UnidadesRepository],
})
export class UnidadesModule {}
