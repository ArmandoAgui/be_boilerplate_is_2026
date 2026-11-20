import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { ReservasHttpFilter } from '../../reservas/filters/reservas-http.filter.js';
import { ListarMorosidadDto } from '../dto/cuotas.dto.js';
import { MorosidadService } from '../services/morosidad.service.js';

@UseFilters(ReservasHttpFilter)
@ApiTags('administracion')
@ApiBearerAuth()
@Controller('administracion/morosidad')
export class MorosidadController {
  constructor(private readonly service: MorosidadService) {}

  /** H4: GET /api/v1/administracion/morosidad?torreId=&pagina=&tamanoPagina= */
  @Get()
  listar(@CurrentUser() user: User, @Query() query: ListarMorosidadDto) {
    return this.service.listar(user, query);
  }

  /** H4: GET /api/v1/administracion/morosidad/:unidadId */
  @Get(':unidadId')
  detalle(
    @CurrentUser() user: User,
    @Param('unidadId', ParseUUIDPipe) unidadId: string,
  ) {
    return this.service.detalle(user, unidadId);
  }
}
