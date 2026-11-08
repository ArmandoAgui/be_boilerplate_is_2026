import { Module } from '@nestjs/common';
import {
  CuotasController,
  GeneracionCuotasController,
} from './controllers/cuotas.controller.js';
import { CuotasRepository } from './repositories/cuotas.repository.js';
import { CuotasService } from './services/cuotas.service.js';

@Module({
  controllers: [GeneracionCuotasController, CuotasController],
  providers: [CuotasService, CuotasRepository],
  exports: [CuotasService],
})
export class CuotasModule {}
