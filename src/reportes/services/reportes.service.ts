import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '@PrismaClient';
import { MorosidadService } from '../../cuotas/services/morosidad.service.js';
import { hoyLocal, soloRoles } from '../../cuotas/services/cuotas.rules.js';
import { ReportesRepository } from '../repositories/reportes.repository.js';
import {
  fechasDelRango,
  horasHabilitadas,
  horasReservadas,
  instantesDelRango,
  porcentaje,
  redondear1,
  validarRango,
  type EstadoIndicador,
  type Rango,
} from './reportes.rules.js';

export interface IndicadorMorosidad {
  estado: EstadoIndicador;
  unidadesMorosas: number;
  unidadesActivas: number;
  porcentaje: number | null;
  saldoVencido: string | null;
}

export interface IndicadorUsoAreas {
  estado: EstadoIndicador;
  horasReservadas: number;
  horasHabilitadas: number;
  porcentaje: number | null;
}

export interface IndicadorIncidencias {
  estado: EstadoIndicador;
  abiertas: number;
  creadas: number;
}

export interface IndicadorParticipacion {
  estado: EstadoIndicador;
  temasCerrados: number;
  porcentajePromedio: number | null;
}

export interface ResumenIndicadores {
  desde: string;
  hasta: string;
  generadoAt: string;
  morosidad: IndicadorMorosidad;
  usoAreas: IndicadorUsoAreas;
  incidenciasAbiertas: IndicadorIncidencias;
  participacion: IndicadorParticipacion;
}

/**
 * H29: indicadores consolidados. Se calculan al consultar y no se guardan,
 * así siempre reflejan los datos reales de cada módulo. H30 reutiliza
 * `calcular` para que el PDF tenga exactamente las mismas cifras.
 */
@Injectable()
export class ReportesService {
  constructor(
    private readonly repo: ReportesRepository,
    private readonly morosidadService: MorosidadService,
  ) {}

  /** GET /reportes/resumen: solo Administrador. */
  resumen(user: User, rango: Rango, ahora = new Date()) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    return this.calcular(rango, ahora);
  }

  async calcular(
    rango: Rango,
    ahora = new Date(),
  ): Promise<ResumenIndicadores> {
    validarRango(rango);
    const [morosidad, usoAreas, incidenciasAbiertas, participacion] =
      await Promise.all([
        this.morosidad(rango, ahora),
        this.usoAreas(rango),
        this.incidencias(rango),
        this.participacion(rango, ahora),
      ]);
    return {
      desde: rango.desde,
      hasta: rango.hasta,
      generadoAt: ahora.toISOString(),
      morosidad,
      usoAreas,
      incidenciasAbiertas,
      participacion,
    };
  }

  /**
   * Unidades con al menos una cuota impaga que venció dentro del período
   * ÷ unidades activas × 100. Usa MorosidadService (H4) para que la lista de
   * unidades morosas sea la misma que ve el administrador en H4.
   */
  private async morosidad(
    rango: Rango,
    ahora: Date,
  ): Promise<IndicadorMorosidad> {
    const fechas = fechasDelRango(rango);
    const [filas, unidadesActivas, cuotasDelPeriodo] = await Promise.all([
      this.morosidadService.calcular(ahora, undefined, fechas),
      this.repo.unidadesActivas(),
      this.repo.cuotasVencidasEnPeriodo(
        fechas.desde,
        fechas.hasta,
        hoyLocal(ahora),
      ),
    ]);
    const unidadesMorosas = filas.length;
    // Sin unidades activas o sin cuotas vencidas en el período no hay base:
    // decir 0 % sería afirmar que todos pagaron.
    if (unidadesActivas === 0 || cuotasDelPeriodo === 0)
      return {
        estado: 'SIN_DATOS',
        unidadesMorosas,
        unidadesActivas,
        porcentaje: null,
        saldoVencido: null,
      };
    const saldo = filas.reduce(
      (suma, f) => suma.plus(f.saldoVencido),
      new Prisma.Decimal(0),
    );
    return {
      estado: 'DATOS',
      unidadesMorosas,
      unidadesActivas,
      porcentaje: porcentaje(unidadesMorosas, unidadesActivas),
      saldoVencido: saldo.toFixed(2),
    };
  }

  /** Horas de reservas Confirmadas que inician en el período ÷ horas habilitadas × 100. */
  private async usoAreas(rango: Rango): Promise<IndicadorUsoAreas> {
    const { inicio, fin } = instantesDelRango(rango);
    const [franjas, reservas] = await Promise.all([
      this.repo.horariosDeAreasActivas(),
      this.repo.reservasConfirmadas(inicio, fin),
    ]);
    const habilitadas = horasHabilitadas(franjas, rango);
    const reservadas = horasReservadas(reservas);
    return {
      estado: habilitadas > 0 ? 'DATOS' : 'SIN_DATOS',
      horasReservadas: redondear1(reservadas),
      horasHabilitadas: redondear1(habilitadas),
      porcentaje: habilitadas > 0 ? porcentaje(reservadas, habilitadas) : null,
    };
  }

  /** Incidencias creadas en el período cuyo estado actual no es Resuelta. */
  private async incidencias(rango: Rango): Promise<IndicadorIncidencias> {
    const { inicio, fin } = instantesDelRango(rango);
    const { creadas, abiertas } = await this.repo.incidencias(inicio, fin);
    return { estado: creadas > 0 ? 'DATOS' : 'SIN_DATOS', abiertas, creadas };
  }

  /**
   * Promedio, por tema cerrado en el período, de unidades que votaron ÷
   * unidades habilitadas × 100 (la misma participación que muestra H22).
   */
  private async participacion(
    rango: Rango,
    ahora: Date,
  ): Promise<IndicadorParticipacion> {
    const { inicio, fin } = instantesDelRango(rango);
    // Un tema está Cerrado cuando ya pasó su cierre; si Hasta es futuro,
    // los temas que aún no cierran no cuentan.
    const hastaCierre = fin < ahora ? fin : ahora;
    const [temas, habilitadas] = await Promise.all([
      this.repo.temasCerrados(inicio, hastaCierre),
      this.repo.unidadesHabilitadas(),
    ]);
    if (temas.length === 0 || habilitadas === 0)
      return {
        estado: 'SIN_DATOS',
        temasCerrados: temas.length,
        porcentajePromedio: null,
      };
    const suma = temas.reduce(
      (total, t) => total + (t._count.participaciones * 100) / habilitadas,
      0,
    );
    return {
      estado: 'DATOS',
      temasCerrados: temas.length,
      porcentajePromedio: redondear1(suma / temas.length),
    };
  }
}
