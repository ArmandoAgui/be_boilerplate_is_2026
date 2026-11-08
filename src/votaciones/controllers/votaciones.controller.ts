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

import { VotacionesService } from '../services/votaciones.service.js';

import {
  EmitirVotoDto,
  ConsultarMiEstadoDto,
} from '../dto/votaciones.dto.js';

@ApiTags('votaciones')
@ApiBearerAuth()
@UseFilters(ReservasHttpFilter)
@Controller('votaciones')
export class VotacionesController {
  constructor(
    private readonly service: VotacionesService,
  ) {}

  @Post(':temaId/votos')
  emitir(
    @CurrentUser() user: User,
    @Param('temaId', ParseUUIDPipe) temaId: string,
    @Body() dto: EmitirVotoDto,
  ) {
    return this.service.emitir(
      user,
      temaId,
      dto,
    );
  }

  @Get(':temaId/miestado')
  miEstado(
    @CurrentUser() user: User,
    @Param('temaId', ParseUUIDPipe) temaId: string,
    @Query() query: ConsultarMiEstadoDto,
  ) {
    return this.service.miEstado(
      user,
      temaId,
      query,
    );
  }

  @Get(':temaId/resultados')
  resultados(
    @CurrentUser() user: User,
    @Param('temaId', ParseUUIDPipe) temaId: string,
  ) {
    return this.service.resultados(
      user,
      temaId,
    );
  }
}
