import { Module } from '@nestjs/common';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import {
  CuotasController,
  GeneracionCuotasController,
} from './controllers/cuotas.controller.js';
import { MorosidadController } from './controllers/morosidad.controller.js';
import { CuotasRepository } from './repositories/cuotas.repository.js';
import { CuotasService } from './services/cuotas.service.js';
import { MorosidadService } from './services/morosidad.service.js';
import { CuotasPorVencerJob } from './services/cuotas-por-vencer.job.js';

@Module({
  imports: [NotificacionesModule],
  controllers: [
    GeneracionCuotasController,
    CuotasController,
    MorosidadController,
  ],
  providers: [
    CuotasService,
    MorosidadService,
    CuotasRepository,
    CuotasPorVencerJob,
  ],
  // MorosidadService se exporta para que H29 (reportes) lo reutilice.
  exports: [CuotasService, MorosidadService],
})
export class CuotasModule {}
