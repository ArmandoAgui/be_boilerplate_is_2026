import {
  Module,
  Injectable,
  Controller,
  Get,
  Query,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { CurrentUser } from '@Auth/decorators';
import type { User } from '@PrismaClient';
import { CuotasModule } from '../cuotas/cuotas.module.js';
import { ReportesController as IndicadoresController } from './controllers/reportes.controller.js';
import { ReportesService as IndicadoresService } from './services/reportes.service.js';
import { ReportePdfService } from './services/reporte-pdf.service.js';
import { ReportesRepository } from './repositories/reportes.repository.js';
import { RangoReporteDto } from './dto/reportes.dto.js';
import { FORMULAS } from './services/reporte-pdf.contenido.js';

// Compatibility contract for the existing presentation view and older clients.
// All numbers and PDFs now come from Heber's single H29/H30 calculation.
@Injectable()
export class ReportesService {
  constructor(private readonly indicadores: IndicadoresService) {}
  async generar(user: User, q: RangoReporteDto) {
    const r = await this.indicadores.resumen(user, q);
    return {
      desde: r.desde,
      hasta: r.hasta,
      generadoAt: r.generadoAt,
      generadoPor: user.nombre,
      criterio:
        'Estado actual; período en America/El_Salvador. Denominadores actuales de cada módulo.',
      indicadores: [
        {
          clave: 'morosidad',
          titulo: 'Morosidad',
          valor: r.morosidad.porcentaje,
          unidad: '%',
          origen: 'Cuotas (H4)',
          formula: FORMULAS.morosidad,
          saldoVencido: r.morosidad.saldoVencido ?? '0.00',
        },
        {
          clave: 'uso',
          titulo: 'Uso de áreas',
          valor: r.usoAreas.porcentaje,
          unidad: '%',
          origen: 'Reservas (H5-H7)',
          formula: FORMULAS.usoAreas,
        },
        {
          clave: 'incidencias',
          titulo: 'Incidencias abiertas',
          valor:
            r.incidenciasAbiertas.estado === 'DATOS'
              ? r.incidenciasAbiertas.abiertas
              : null,
          unidad: '',
          origen: 'Incidencias (H9-H11)',
          formula: FORMULAS.incidencias,
        },
        {
          clave: 'participacion',
          titulo: 'Participación en votaciones',
          valor: r.participacion.porcentajePromedio,
          unidad: '%',
          origen: 'Asambleas (H22)',
          formula: FORMULAS.participacion,
        },
      ],
    };
  }
}
@Controller('administracion/reportes')
class ReportesController {
  constructor(
    private readonly service: ReportesService,
    private readonly pdfService: ReportePdfService,
  ) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  generar(@CurrentUser() u: User, @Query() q: RangoReporteDto) {
    return this.service.generar(u, q);
  }
  @Get('pdf')
  @Header('Cache-Control', 'private, no-store')
  async pdf(@CurrentUser() u: User, @Query() q: RangoReporteDto) {
    const { archivo, nombre } = await this.pdfService.generar(u, q);
    return new StreamableFile(archivo, {
      type: 'application/pdf',
      disposition: `attachment; filename="${nombre}"`,
      length: archivo.length,
    });
  }
}
@Module({
  imports: [CuotasModule],
  controllers: [ReportesController, IndicadoresController],
  providers: [
    ReportesService,
    IndicadoresService,
    ReportePdfService,
    ReportesRepository,
  ],
})
export class ReportesModule {}
