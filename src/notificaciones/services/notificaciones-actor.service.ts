import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Rol, type User } from '@PrismaClient';
import { UsersService } from '@Users/services';

/** Verifica al residente contra la cuenta actual, no contra datos del token. */
@Injectable()
export class NotificacionesActorService {
  constructor(private readonly usersService: UsersService) {}

  async exigirResidenteActivo(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('La cuenta no existe o está inactiva.');
    }

    if (user.rol !== Rol.RESIDENTE) {
      throw new ForbiddenException(
        'Solo un residente activo puede consultar sus avisos.',
      );
    }

    return user;
  }
}
