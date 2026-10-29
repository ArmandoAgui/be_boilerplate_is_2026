import {
  Body,
  Controller,
  UseFilters,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReservasHttpFilter } from '../filters/reservas-http.filter.js';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { ReservasService } from '../services/reservas.service.js';
import {
  CrearAreaDto,
  EditarAreaDto,
  CrearReservaDto,
  FechaDto,
  ListarReservasDto,
} from '../dto/reservas.dto.js';

@UseFilters(ReservasHttpFilter)
@ApiTags('areas')
@ApiBearerAuth()
@Controller('areas')
export class AreasController {
  constructor(private readonly service: ReservasService) {}
  @Get() listar(@CurrentUser() user: User) {
    return this.service.areas(user);
  }
  @Get(':id/disponibilidad') disponibilidad(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FechaDto,
  ) {
    return this.service.disponibilidad(user, id, query.fecha);
  }
  @Post() crear(@CurrentUser() user: User, @Body() data: CrearAreaDto) {
    return this.service.guardarArea(user, data);
  }
  @Patch(':id') editar(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: EditarAreaDto,
  ) {
    return this.service.guardarArea(user, data, id);
  }
}
@UseFilters(ReservasHttpFilter)
@ApiTags('reservas')
@ApiBearerAuth()
@Controller('reservas')
export class ReservasController {
  constructor(private readonly service: ReservasService) {}
  @Post() crear(@CurrentUser() user: User, @Body() data: CrearReservaDto) {
    return this.service.crear(user, data);
  }
  @Get('mias') mias(
    @CurrentUser() user: User,
    @Query() query: ListarReservasDto,
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
@UseFilters(ReservasHttpFilter)
@ApiTags('unidades')
@ApiBearerAuth()
@Controller('unidades')
export class UnidadesReservaController {
  constructor(private readonly service: ReservasService) {}
  @Get('mias') mias(@CurrentUser() user: User) {
    return this.service.unidades(user);
  }
}
