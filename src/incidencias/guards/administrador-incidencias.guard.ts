import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';
import type { RequestWithUser } from '@Auth/decorators';
import { IncidenciasService } from '../services/incidencias.service.js';

/** Exige una sesión activa de Administrador para los endpoints H10. */
@Injectable()
export class AdministradorIncidenciasGuard implements CanActivate {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('La sesión es obligatoria.');
    }

    await this.incidenciasService.verificarAdministradorActivo(user.id);
    return true;
  }
}
