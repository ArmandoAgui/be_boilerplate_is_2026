import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { VisitasHttpFilter } from '../filters/visitas-http.filter.js';
import { VisitasService } from '../services/visitas.service.js';
import {
  CrearAutorizacionDto,
  ListarAutorizacionesDto,
} from '../dto/visitas.dto.js';

@UseFilters(VisitasHttpFilter)
@ApiTags('visitas')
@ApiBearerAuth()
@Controller('visitas/autorizaciones')
export class AutorizacionesController {
  constructor(private readonly service: VisitasService) {}

  @Post() crear(@CurrentUser() user: User, @Body() data: CrearAutorizacionDto) {
    return this.service.crear(user, data);
  }

  @Get('mias') mias(
    @CurrentUser() user: User,
    @Query() query: ListarAutorizacionesDto,
  ) {
    return this.service.mias(user, query);
  }

  @Patch(':id/cancelacion') cancelar(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancelar(user, id);
  }
}
