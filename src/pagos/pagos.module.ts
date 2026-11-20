import { Module } from '@nestjs/common';
import { PagosController } from './controllers/pagos.controller.js';
import { PagosRepository } from './repositories/pagos.repository.js';
import { PagosService } from './services/pagos.service.js';
import { PasarelaSimuladaService } from './services/pasarela-simulada.service.js';

@Module({
  controllers: [PagosController],
  providers: [PagosService, PagosRepository, PasarelaSimuladaService],
})
export class PagosModule {}
