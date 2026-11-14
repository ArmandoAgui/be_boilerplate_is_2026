import { Module } from '@nestjs/common';
import { PrismaModule } from '@Prisma';
import { UsersModule } from '@Users';
import { NotificacionesController } from './controllers/notificaciones.controller.js';
import { ResidenteNotificacionesGuard } from './guards/residente-notificaciones.guard.js';
import { NotificacionIdPipe } from './pipes/notificacion-id.pipe.js';
import { NotificacionesRepository } from './repositories/notificaciones.repository.js';
import { BandejaNotificacionesService } from './services/bandeja-notificaciones.service.js';
import { NotificacionesActorService } from './services/notificaciones-actor.service.js';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [NotificacionesController],
  providers: [
    BandejaNotificacionesService,
    NotificacionesRepository,
    NotificacionesActorService,
    ResidenteNotificacionesGuard,
    NotificacionIdPipe,
  ],
  exports: [BandejaNotificacionesService],
})
export class NotificacionesModule {}
