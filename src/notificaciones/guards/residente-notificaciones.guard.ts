import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestWithUser } from '@Auth/decorators';
import { NotificacionesActorService } from '../services/notificaciones-actor.service.js';

/** Restringe la bandeja al Residente activo cargado por JwtAuthGuard. */
@Injectable()
export class ResidenteNotificacionesGuard implements CanActivate {
  constructor(
    private readonly actorService: NotificacionesActorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('La sesión es obligatoria.');
    }

    await this.actorService.exigirResidenteActivo(user.id);
    return true;
  }
}
