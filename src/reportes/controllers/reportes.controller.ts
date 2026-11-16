import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
// Misma forma de error que cuotas y pagos: { statusCode, error, message }.
import { ReservasHttpFilter } from '../../reservas/filters/reservas-http.filter.js';
import { RangoReporteDto } from '../dto/reportes.dto.js';
import { ReportesService } from '../services/reportes.service.js';

@UseFilters(ReservasHttpFilter)
@ApiTags('reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  /** H29: GET /api/v1/reportes/resumen?desde=AAAA-MM-DD&hasta=AAAA-MM-DD */
  @Get('resumen')
  resumen(@CurrentUser() user: User, @Query() query: RangoReporteDto) {
    return this.service.resumen(user, query);
  }
}
