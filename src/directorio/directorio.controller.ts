import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { PreferenciasDirectorioDto } from './directorio.dto.js';
import { DirectorioService } from './directorio.service.js';

@Controller('directorio')
export class DirectorioController {
  constructor(private readonly service: DirectorioService) {}
  @Get('mis-preferencias') obtener(@CurrentUser() user: User) {
    return this.service.obtener(user);
  }
  @Put('mis-preferencias') guardar(
    @CurrentUser() user: User,
    @Body() dto: PreferenciasDirectorioDto,
  ) {
    return this.service.guardar(user, dto);
  }
}
