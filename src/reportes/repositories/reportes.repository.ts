import { Injectable } from '@nestjs/common';
import { PrismaService } from '@Prisma/services';

/**
 * Consultas agregadas de solo lectura para H29. No hay tabla de reportes:
 * todo se calcula al consultar sobre los modelos de cada módulo.
 */
@Injectable()
export class ReportesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Morosidad (cuotas, H4) ----------

  unidadesActivas() {
    return this.prisma.unidad.count({ where: { activa: true } });
  }

  /** Cuotas que vencieron dentro del período y antes de hoy, pagadas o no. */
  cuotasVencidasEnPeriodo(desde: Date, hasta: Date, hoy: Date) {
    return this.prisma.cuota.count({
      where: { fechaVencimiento: { gte: desde, lte: hasta, lt: hoy }, estado: { not: 'ANULADA' }, unidad: { activa: true } },
    });
  }

  // ---------- Uso de áreas (reservas, H5 a H7) ----------

  horariosDeAreasActivas() {
    return this.prisma.horarioArea.findMany({
      where: { area: { activa: true } },
      select: { diaSemana: true, horaInicio: true, horaFin: true },
    });
  }

  reservasConfirmadas(inicio: Date, fin: Date) {
    return this.prisma.reserva.findMany({
      where: {
        estado: 'CONFIRMADA',
        inicio: { gte: inicio, lt: fin },
        area: { activa: true },
      },
      select: { inicio: true, fin: true },
    });
  }

  // ---------- Incidencias (H9 a H11) ----------

  async incidencias(inicio: Date, fin: Date) {
    const creadasEnPeriodo = { createdAt: { gte: inicio, lt: fin } };
    const [creadas, abiertas] = await Promise.all([
      this.prisma.incidencia.count({ where: creadasEnPeriodo }),
      this.prisma.incidencia.count({
        where: { ...creadasEnPeriodo, estado: { not: 'RESUELTA' } },
      }),
    ]);
    return { creadas, abiertas };
  }

  // ---------- Participación (votaciones, H22) ----------

  /** Temas de asambleas publicadas cuyo cierre cae en [inicio, hastaCierre). */
  temasCerrados(inicio: Date, hastaCierre: Date) {
    return this.prisma.temaVotacion.findMany({
      where: {
        asamblea: { estado: 'PUBLICADA' },
        cierreAt: { gte: inicio, lt: hastaCierre },
      },
      select: { id: true, _count: { select: { participaciones: true } } },
    });
  }

  /**
   * Misma definición que H22 (AsambleasRepository.unidadesHabilitadas):
   * unidades activas con al menos un residente activo. Si H22 cambia esta
   * regla, hay que cambiarla aquí también para que las cifras coincidan.
   */
  unidadesHabilitadas() {
    return this.prisma.unidad.count({
      where: {
        activa: true,
        usuarios: { some: { user: { isActive: true, rol: 'RESIDENTE' } } },
      },
    });
  }
}
