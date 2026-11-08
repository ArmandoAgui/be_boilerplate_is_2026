import { Body, Controller, Get, Post, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
// Reutiliza el filtro de Reservas para responder con la forma de error común
// del documento: { statusCode, error, message }.
import { ReservasHttpFilter } from '../../reservas/filters/reservas-http.filter.js';
import { PeriodoDto } from '../dto/cuotas.dto.js';
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
