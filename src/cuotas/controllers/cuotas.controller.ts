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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
// Reutiliza el filtro de Reservas para responder con la forma de error común
// del documento: { statusCode, error, message }.
import { ReservasHttpFilter } from '../../reservas/filters/reservas-http.filter.js';
import { ListarMisCuotasDto, PeriodoDto } from '../dto/cuotas.dto.js';
import { CuotasService } from '../services/cuotas.service.js';

@UseFilters(ReservasHttpFilter)
@ApiTags('cuotas')
@ApiBearerAuth()
@Controller('cuotas/generaciones')
export class GeneracionCuotasController {
  constructor(private readonly service: CuotasService) {}

  /** GET /api/v1/cuotas/generaciones/previa?periodo=AAAA-MM */
  @Get('previa')
  previa(@CurrentUser() user: User, @Query() query: PeriodoDto) {
    return this.service.previa(user, query.periodo);
  }

  /** POST /api/v1/cuotas/generaciones { "periodo": "AAAA-MM" } → 201 */
  @Post()
  generar(@CurrentUser() user: User, @Body() body: PeriodoDto) {
    return this.service.generar(user, body.periodo);
  }
}

@UseFilters(ReservasHttpFilter)
@ApiTags('cuotas')
@ApiBearerAuth()
@Controller('cuotas')
export class CuotasController {
  constructor(private readonly service: CuotasService) {}

  /** H1: GET /api/v1/cuotas/mis-cuotas?unidadId=...&periodo=&estado=&pagina=&tamanoPagina= */
  @Get('mis-cuotas')
  misCuotas(@CurrentUser() user: User, @Query() query: ListarMisCuotasDto) {
    return this.service.misCuotas(user, query);
  }

  /** H1: GET /api/v1/cuotas/:id. Va después de mis-cuotas para no capturar esa ruta. */
  @Get(':id')
  detalle(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.detalle(user, id);
  }
}
