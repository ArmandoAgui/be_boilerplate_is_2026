import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@PrismaClient';

/**
 * Forma pública de un usuario.
 *
 * Los controladores devuelven esto y nunca la fila cruda de Prisma, para que
 * `passwordHash` no pueda filtrarse en una respuesta por descuido.
 */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'nestor@example.com', format: 'email' })
  email!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ enum: ['RESIDENTE', 'ADMINISTRADOR', 'SEGURIDAD'] })
  rol!: User['rol'];

  @ApiProperty()
  nombre!: string;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      rol: user.rol,
      nombre: user.nombre,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
