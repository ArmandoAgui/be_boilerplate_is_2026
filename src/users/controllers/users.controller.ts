import { Body, Controller, Post, ForbiddenException } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import { UsersService } from '@Users/services';
import { CreateUserDto, UserResponseDto } from '@Users/dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Registro. Crear un usuario es crear un recurso, así que es un POST a la
   * colección `/users` y responde 201 (el default de Nest para POST).
   */
  @Post()
  @ApiOperation({ summary: 'Registra un nuevo usuario' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'El nombre de usuario ya está en uso.' })
  async create(
    @CurrentUser() actor: import('@PrismaClient').User,
    @Body() dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    if (actor.rol !== 'ADMINISTRADOR')
      throw new ForbiddenException(
        'Solo administración puede registrar usuarios',
      );
    const user = await this.usersService.create(dto);
    return UserResponseDto.fromEntity(user);
  }
}
