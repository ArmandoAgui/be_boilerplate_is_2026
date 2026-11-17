import { ReportePdfService } from './services/reporte-pdf.service.js';
import { CuotasModule } from '../cuotas/cuotas.module.js';
import { ReportesController as IndicadoresController } from './controllers/reportes.controller.js';
import { ReportesService as IndicadoresService } from './services/reportes.service.js';
import { ReportesRepository } from './repositories/reportes.repository.js';
import {
  Module,
  Header,
  Injectable,
  Controller,
  Get,
  Query,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser } from '@Auth/decorators';
import { Prisma, type User } from '@PrismaClient';
import { PrismaService } from '@Prisma/services';
import { hoyLocal, soloRoles } from '../cuotas/services/cuotas.rules.js';
import { importes } from '../cuotas/services/importes.js';
import {
  rangoReporte,
  horasHabilitadas,
  redondear,
  pdfTexto,
} from './reportes.rules.js';
class ReporteDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) desde!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) hasta!: string;
}
@Injectable()
export class ReportesService {
  constructor(private readonly db: PrismaService) {}
  async generar(user: User, q: ReporteDto) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    const r = rangoReporte(q.desde, q.hasta),
      ahora = new Date();
    return this.db.$transaction(
      async (tx) => {
        const unidadesActivas = await tx.unidad.count({
          where: { activa: true },
        });
        const cuotas = await tx.cuota.findMany({
          where: {
            fechaVencimiento: { gte: r.fechaDesde, lte: r.fechaHasta },
            estado: { not: 'ANULADA' },
            unidad: { activa: true },
          },
        });
        const impagas = cuotas.filter(
          (c) =>
            c.estado === 'PENDIENTE' && c.fechaVencimiento < hoyLocal(ahora),
        );
        const unidadesMorosas = new Set(impagas.map((c) => c.unidadId)).size;
        const saldo = impagas.reduce(
          (s, c) => s.add(importes(c, ahora).total),
          new Prisma.Decimal(0),
        );
        const areas = await tx.areaComun.findMany({
          where: { activa: true },
          include: { horarios: true },
        });
        const reservas = await tx.reserva.findMany({
          where: {
            estado: 'CONFIRMADA',
            inicio: { gte: r.inicio, lt: r.fin },
            area: { activa: true },
          },
          select: { inicio: true, fin: true },
        });
        const habilitadas = horasHabilitadas(q.desde, q.hasta, areas),
          reservadas = reservas.reduce(
            (s, x) => s + (x.fin.getTime() - x.inicio.getTime()) / 3600000,
            0,
          );
        const incidencias = await tx.incidencia.groupBy({
          by: ['estado'],
          where: { createdAt: { gte: r.inicio, lt: r.fin } },
          _count: { _all: true },
        });
        const creadas = incidencias.reduce((s, x) => s + x._count._all, 0),
          abiertas = incidencias
            .filter((x) => x.estado !== 'RESUELTA')
            .reduce((s, x) => s + x._count._all, 0);
        const unidadesHabilitadas = await tx.unidad.count({
          where: {
            activa: true,
            usuarios: { some: { user: { rol: 'RESIDENTE', isActive: true } } },
          },
        });
        const temas = await tx.temaVotacion.findMany({
          where: {
            asamblea: { estado: 'PUBLICADA' },
            cierreAt: { gte: r.inicio, lt: r.fin, lte: ahora },
          },
          select: { _count: { select: { participaciones: true } } },
        });
        return {
          desde: q.desde,
          hasta: q.hasta,
          generadoAt: ahora.toISOString(),
          generadoPor: user.nombre,
          criterio:
            'Estado actual de registros; fechas del período en America/El_Salvador. Denominadores actuales, iguales a los módulos de origen.',
          indicadores: [
            {
              clave: 'morosidad',
              titulo: 'Morosidad',
              valor:
                unidadesActivas && cuotas.length
                  ? redondear((unidadesMorosas * 100) / unidadesActivas)
                  : null,
              unidad: '%',
              origen: 'Cuotas (H4)',
              formula:
                'Unidades activas con cuotas impagas vencidas en el periodo / unidades activas x 100',
              saldoVencido: saldo.toFixed(2),
            },
            {
              clave: 'uso',
              titulo: 'Uso de áreas',
              valor: habilitadas
                ? redondear((reservadas * 100) / habilitadas)
                : null,
              unidad: '%',
              origen: 'Reservas (H5-H7)',
              formula:
                'Horas confirmadas con inicio en el periodo / horas habilitadas de areas activas x 100',
            },
            {
              clave: 'incidencias',
              titulo: 'Incidencias abiertas',
              valor: creadas ? abiertas : null,
              unidad: '',
              origen: 'Incidencias (H9-H11)',
              formula:
                'Incidencias creadas en el periodo cuyo estado actual no es Resuelta',
            },
            {
              clave: 'participacion',
              titulo: 'Participación en votaciones',
              valor:
                temas.length && unidadesHabilitadas
                  ? redondear(
                      temas.reduce(
                        (s, t) =>
                          s +
                          (t._count.participaciones * 100) /
                            unidadesHabilitadas,
                        0,
                      ) / temas.length,
                    )
                  : null,
              unidad: '%',
              origen: 'Asambleas (H22)',
              formula:
                'Promedio por tema cerrado: unidades que votaron / unidades habilitadas x 100',
            },
          ],
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 15000 },
    );
  }
}
@Controller('administracion/reportes')
class ReportesController {
  constructor(private readonly service: ReportesService) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  generar(@CurrentUser() u: User, @Query() q: ReporteDto) {
    return this.service.generar(u, q);
  }
  @Get('pdf') async pdf(
    @CurrentUser() u: User,
    @Query() q: ReporteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.service.generar(u, q);
    const lineas = [
      'SONNET 5 - Reporte general del condominio',
      `Periodo: ${r.desde} a ${r.hasta}`,
      `Generado: ${r.generadoAt}`,
      `Administrador: ${r.generadoPor}`,
      'Compartible con residentes y otros destinatarios. Sin datos personales.',
      '',
      ...r.indicadores.flatMap((i) => [
        `${i.titulo}: ${i.valor === null ? 'Sin datos' : i.valor + i.unidad}`,
        `Origen: ${i.origen}`,
        i.formula,
        ...('saldoVencido' in i
          ? [`Saldo vencido: USD ${i.saldoVencido}`]
          : []),
        '',
      ]),
      'Calculos al momento de generar, con denominadores actuales.',
    ];
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(pdfTexto(lineas), {
      type: 'application/pdf',
      disposition: `attachment; filename="reporte_${q.desde}_${q.hasta}.pdf"`,
    });
  }
}
@Module({
  imports: [CuotasModule],
  controllers: [ReportesController, IndicadoresController],
  providers: [ReportesService, IndicadoresService, ReportePdfService, ReportesRepository],
})
export class ReportesModule {}
