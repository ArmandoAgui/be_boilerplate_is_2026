import {
  Controller,
  Get,
  Header,
  Query,
  StreamableFile,
  UseFilters,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
// Misma forma de error que cuotas y pagos: { statusCode, error, message }.
import { ReservasHttpFilter } from '../../reservas/filters/reservas-http.filter.js';
import { RangoReporteDto } from '../dto/reportes.dto.js';
import { ReportePdfService } from '../services/reporte-pdf.service.js';
import { ReportesService } from '../services/reportes.service.js';

@UseFilters(ReservasHttpFilter)
@ApiTags('reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly service: ReportesService,
    private readonly pdf: ReportePdfService,
  ) {}

  /** H29: GET /api/v1/reportes/resumen?desde=AAAA-MM-DD&hasta=AAAA-MM-DD */
  @Get('resumen')
  resumen(@CurrentUser() user: User, @Query() query: RangoReporteDto) {
    return this.service.resumen(user, query);
  }

  /**
   * H30: GET /api/v1/reportes/administrativos/pdf?desde=&hasta=
   * Descarga el reporte; no se guarda en el servidor ni genera enlaces.
   */
  @Get('administrativos/pdf')
  @ApiProduces('application/pdf')
  @Header('Cache-Control', 'no-store')
  async descargarPdf(
    @CurrentUser() user: User,
    @Query() query: RangoReporteDto,
  ): Promise<StreamableFile> {
    const { archivo, nombre } = await this.pdf.generar(user, query);
    return new StreamableFile(archivo, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nombre}"`,
      length: archivo.length,
    });
  }
}
