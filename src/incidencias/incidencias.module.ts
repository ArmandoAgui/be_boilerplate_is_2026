import { Module } from '@nestjs/common';
import { IncidenciasController } from './controllers/incidencias.controller.js';
import { IncidenciasRepository } from './repositories/incidencias.repository.js';
import { IncidenciaLugarService } from './services/incidencia-lugar.service.js';
import { IncidenciasService } from './services/incidencias.service.js';
import { EvidenciasStorage } from './storage/evidencias.storage.js';
import { ResidenteIncidenciasGuard } from './guards/residente-incidencias.guard.js';

@Module({
  controllers: [IncidenciasController],
  providers: [
    IncidenciasService,
    IncidenciasRepository,
    IncidenciaLugarService,
    EvidenciasStorage,
    ResidenteIncidenciasGuard,
  ],
})
export class IncidenciasModule {}
