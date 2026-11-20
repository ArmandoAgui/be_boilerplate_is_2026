import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestWithUser } from '@Auth/decorators';
import { IncidenciasRepository } from '../repositories/incidencias.repository.js';

/**
 * Restringe la creación de incidencias a residentes.
 *
 * JwtAuthGuard se ejecuta como guarda global y carga la identidad activa desde
 * la base antes que esta guarda de controlador. El rol se vuelve a leer en
 * Repository; no se acepta desde el body ni desde un claim JWT.
 */
@Injectable()
export class ResidenteIncidenciasGuard implements CanActivate {
  constructor(private readonly incidenciasRepository: IncidenciasRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('La sesión es obligatoria.');
    }

    const userAccess = await this.incidenciasRepository.findUserAccess(user.id);
    if (!userAccess || !userAccess.isActive) {
      throw new UnauthorizedException('La cuenta no existe o está inactiva.');
    }

    if (userAccess.rol !== 'RESIDENTE') {
      throw new ForbiddenException('Solo un residente puede reportar incidencias.');
    }

    return true;
  }
}
