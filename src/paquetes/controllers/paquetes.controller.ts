import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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

import { PaquetesService } from '../services/paquetes.service.js';
import { ListarMisPaquetesDto } from '../dto/paquetes.dto.js';

@ApiTags('paquetes')
@ApiBearerAuth()
@UseFilters(ReservasHttpFilter)
@Controller('paquetes')
export class PaquetesController {
  constructor(
    private readonly service: PaquetesService,
  ) {}

  @Get('mios')
  mios(
    @CurrentUser() user: User,
    @Query() query: ListarMisPaquetesDto,
  ) {
    return this.service.mios(user, query);
  }

  @Get(':id')
  detalle(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.detalle(user, id);
  }
}
