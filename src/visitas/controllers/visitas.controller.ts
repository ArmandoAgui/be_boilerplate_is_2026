import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  BuscarAutorizacionesDto,
  CrearAutorizacionDto,
  ListarAutorizacionesDto,
  PresentesDto,
  RegistrarEntradaDto,
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

  // Buscador de la puerta (H14). Solo devuelve lo utilizable en este momento.
  @Get() buscar(
    @CurrentUser() user: User,
    @Query() query: BuscarAutorizacionesDto,
  ) {
    return this.service.buscarAutorizaciones(user, query.buscar);
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

@UseFilters(VisitasHttpFilter)
@ApiTags('visitas')
@ApiBearerAuth()
@Controller('visitas/entradas')
export class EntradasController {
  constructor(private readonly service: VisitasService) {}

  @Post() registrar(
    @CurrentUser() user: User,
    @Body() data: RegistrarEntradaDto,
  ) {
    return this.service.registrarEntrada(user, data);
  }

  // La salida no crea nada: cierra un movimiento que ya existe, así que
  // devuelve 200 y no el 201 que Nest le pone por defecto a todo POST.
  @HttpCode(HttpStatus.OK)
  @Post(':id/salida') salida(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.registrarSalida(user, id);
  }
}

@UseFilters(VisitasHttpFilter)
@ApiTags('visitas')
@ApiBearerAuth()
@Controller('visitas/presentes')
export class PresentesController {
  constructor(private readonly service: VisitasService) {}

  @Get() listar(@CurrentUser() user: User, @Query() query: PresentesDto) {
    return this.service.presentes(user, query);
  }
}

/**
 * Las unidades son un catálogo compartido, no algo de visitas. Vive bajo
 * `visitas/` a propósito, para no apropiarse del namespace `/unidades` que ya
 * usa reservas y que paquetería va a necesitar igual. Cuando el equipo decida
 * dónde centralizarlo, esta ruta se mueve y el frontend cambia una constante.
 */
@UseFilters(VisitasHttpFilter)
@ApiTags('visitas')
@ApiBearerAuth()
@Controller('visitas/unidades')
export class UnidadesVisitaController {
  constructor(private readonly service: VisitasService) {}

  @Get() listar(@CurrentUser() user: User) {
    return this.service.unidadesActivas(user);
  }
}
