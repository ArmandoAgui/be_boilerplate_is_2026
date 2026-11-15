import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { DirectorioService } from './directorio.service.js';
import { Body, Controller, Get, ParseUUIDPipe, Param, Put, Query } from '@nestjs/common';
import { BuscarDirectorioDto, PreferenciasDirectorioDto } from './directorio.dto.js';
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
    @Get() buscar(@CurrentUser() user: User, @Query() dto: BuscarDirectorioDto) {
    return this.service.buscar(user, dto);
  }
  @Get(':id') ficha(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.ficha(user, id);
  }
}
