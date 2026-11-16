import { Module } from '@nestjs/common';
import { CuotasModule } from '../cuotas/cuotas.module.js';
import { ReportesController } from './controllers/reportes.controller.js';
import { ReportesRepository } from './repositories/reportes.repository.js';
import { ReportesService } from './services/reportes.service.js';

@Module({
  // CuotasModule exporta MorosidadService (H4), que H29 reutiliza.
  imports: [CuotasModule],
  controllers: [ReportesController],
  providers: [ReportesService, ReportesRepository],
})
export class ReportesModule {}
