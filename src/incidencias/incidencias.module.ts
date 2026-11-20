import { Module } from '@nestjs/common';
import { IncidenciasController } from './controllers/incidencias.controller.js';
import { IncidenciasRepository } from './repositories/incidencias.repository.js';
import { IncidenciaLugarService } from './services/incidencia-lugar.service.js';
import { IncidenciasService } from './services/incidencias.service.js';
import { EvidenciasStorage } from './storage/evidencias.storage.js';
import { AdministradorIncidenciasGuard } from './guards/administrador-incidencias.guard.js';
import { ResidenteIncidenciasGuard } from './guards/residente-incidencias.guard.js';
import { ActualizarAsignacionBodyPipe } from './pipes/actualizar-asignacion-body.pipe.js';
import { ActualizarEstadoIncidenciaBodyPipe } from './pipes/actualizar-estado-incidencia-body.pipe.js';
import { NotificacionesModule } from '../notificaciones/notificaciones.module.js';
import { NotificacionesService } from '../notificaciones/services/notificaciones.service.js';
import { H28_NOTIFICACIONES_PORT } from './notificaciones/h28-notificaciones.port.js';

@Module({
  imports: [NotificacionesModule],
  controllers: [IncidenciasController],
  providers: [
    IncidenciasService,
    IncidenciasRepository,
    IncidenciaLugarService,
    EvidenciasStorage,
    AdministradorIncidenciasGuard,
    ResidenteIncidenciasGuard,
    ActualizarAsignacionBodyPipe,
    ActualizarEstadoIncidenciaBodyPipe,
    { provide: H28_NOTIFICACIONES_PORT, useExisting: NotificacionesService },
  ],
})
export class IncidenciasModule {}
