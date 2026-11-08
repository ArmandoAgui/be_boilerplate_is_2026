import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';

import { ReservasHttpFilter } from '../../reservas/filters/reservas-http.filter.js';

import { AsambleasService } from '../services/asambleas.service.js';

import {
  CrearAsambleaDto,
  ListarAsambleasDto,
} from '../dto/asambleas.dto.js';

@ApiTags('asambleas')
@ApiBearerAuth()
@UseFilters(ReservasHttpFilter)
@Controller('asambleas')
export class AsambleasController {
  constructor(
    private readonly service: AsambleasService,
  ) {}

  @Post()
  crear(
    @CurrentUser() user: User,
    @Body() dto: CrearAsambleaDto,
  ) {
    return this.service.crear(user, dto);
  }

  @Post(':id/publicacion')
  publicar(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.publicar(user, id);
  }

  @Get()
  listar(
    @CurrentUser() user: User,
    @Query() query: ListarAsambleasDto,
  ) {
    return this.service.listar(user, query);
  }

  @Get(':id/temas')
  temas(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.temasDeAsamblea(user, id);
  }
}
