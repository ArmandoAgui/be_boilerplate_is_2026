import { Body, Controller, Get, Post, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { PaquetesHttpFilter } from '../filters/paquetes-http.filter.js';
import { PaquetesService } from '../services/paquetes.service.js';
import { CrearPaqueteDto, ListarPaquetesDto } from '../dto/paquetes.dto.js';

@UseFilters(PaquetesHttpFilter)
@ApiTags('paquetes')
@ApiBearerAuth()
@Controller('paquetes')
export class PaquetesController {
  constructor(private readonly service: PaquetesService) {}

  @Post() registrar(@CurrentUser() user: User, @Body() data: CrearPaqueteDto) {
    return this.service.registrar(user, data);
  }

  @Get() listar(@CurrentUser() user: User, @Query() query: ListarPaquetesDto) {
    return this.service.listar(user, query);
  }
}
