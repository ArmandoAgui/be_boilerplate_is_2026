import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { UnidadesHttpFilter } from '../filters/unidades-http.filter.js';
import { UnidadesService } from '../services/unidades.service.js';
import { ListarUnidadesDto } from '../dto/unidades.dto.js';

// Convive con el `unidades/mias` de reservas: son rutas distintas bajo el
// mismo prefijo, así que Nest las resuelve sin conflicto.
@UseFilters(UnidadesHttpFilter)
@ApiTags('unidades')
@ApiBearerAuth()
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly service: UnidadesService) {}

  @Get() listar(@CurrentUser() user: User, @Query() query: ListarUnidadesDto) {
    return this.service.activas(user, query.buscar);
  }
}
