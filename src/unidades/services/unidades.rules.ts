import { ForbiddenException } from '@nestjs/common';
import type { Rol } from '@PrismaClient';

// Mismo helper que reservas, visitas y cuotas. Se repite a propósito para que
// este módulo no dependa del de nadie; va a @Common cuando el equipo lo decida.
export function permitir(rol: Rol, ...roles: Rol[]): void {
  if (!roles.includes(rol))
    throw new ForbiddenException(
      'No tienes permiso para realizar esta operación',
    );
}
