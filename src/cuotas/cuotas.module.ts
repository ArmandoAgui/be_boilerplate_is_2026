import { Module } from '@nestjs/common';
import {
  CuotasController,
  GeneracionCuotasController,
} from './controllers/cuotas.controller.js';
import { MorosidadController } from './controllers/morosidad.controller.js';
import { CuotasRepository } from './repositories/cuotas.repository.js';
import { CuotasService } from './services/cuotas.service.js';
import { MorosidadService } from './services/morosidad.service.js';

@Module({
  controllers: [
    GeneracionCuotasController,
    CuotasController,
    MorosidadController,
  ],
  providers: [CuotasService, MorosidadService, CuotasRepository],
  // MorosidadService se exporta para que H29 (reportes) lo reutilice.
  exports: [CuotasService, MorosidadService],
})
export class CuotasModule {}
