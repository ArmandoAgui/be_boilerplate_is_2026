import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import {
  AudienciaComunicadoDto,
  CrearComunicadoDto,
  PaginaComunicadosDto,
} from './comunicados.dto.js';
import { ComunicadosService } from './comunicados.service.js';
@Controller('comunicados')
export class ComunicadosController {
  constructor(private readonly service: ComunicadosService) {}
  @Post() crear(@CurrentUser() user: User, @Body() dto: CrearComunicadoDto) {
    return this.service.crear(user, dto);
  }
  @Get('mios') mios(
    @CurrentUser() user: User,
    @Query() query: PaginaComunicadosDto,
  ) {
    return this.service.mios(user, query);
  }
  @Get('administracion') administracion(
    @CurrentUser() user: User,
    @Query() query: PaginaComunicadosDto,
  ) {
    return this.service.administracion(user, query);
  }
  @Get('destinatarios') previa(
    @CurrentUser() user: User,
    @Query() dto: AudienciaComunicadoDto,
  ) {
    return this.service.previa(user, dto);
  }
  @Get(':id') detalle(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.detalle(user, id);
  }
}
@Controller('torres')
export class TorresComunicadosController {
  constructor(private readonly service: ComunicadosService) {}
  @Get() listar(@CurrentUser() user: User) {
    return this.service.torres(user);
  }
}
