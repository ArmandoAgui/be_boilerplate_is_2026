import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Cuota, type User } from '@PrismaClient';
import type { ListarMisCuotasDto } from '../dto/cuotas.dto.js';
import { CuotasRepository } from '../repositories/cuotas.repository.js';
import {
  CONCEPTO_MANTENIMIENTO,
  clasificarUnidades,
  estadoVisible,
  fechaVencimiento,
  filtroEstado,
  hoyLocal,
  soloRoles,
  validarPeriodo,
} from './cuotas.rules.js';

@Injectable()
export class CuotasService {
  constructor(private readonly repo: CuotasRepository) {}

  /** H3: resumen antes de generar (unidades a generar, omitidas y total). */
  async previa(user: User, periodo: string, ahora = new Date()) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    validarPeriodo(periodo, ahora);
    const { aGenerar, omitidas } = await this.planificar(periodo);
    const total = aGenerar.reduce(
      (suma, u) => suma.plus(u.cuotaMensual),
      new Prisma.Decimal(0),
    );
    return {
      periodo,
      unidadesAGenerar: aGenerar.length,
      unidadesOmitidas: omitidas.length,
      totalUsd: total.toFixed(2),
    };
  }

  /** H3: crea una cuota por unidad activa; si no hay nada que crear, 409. */
  async generar(user: User, periodo: string, ahora = new Date()) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    validarPeriodo(periodo, ahora);
    return this.repo.transaccion(async (tx) => {
      const { aGenerar, omitidas } = await this.planificar(periodo, tx);
      if (aGenerar.length === 0) {
        throw new ConflictException(
          'Todas las unidades ya tienen cuota para este período',
        );
      }
      const vence = fechaVencimiento(periodo);
      const { count } = await this.repo.crearCuotas(
        aGenerar.map((u) => ({
          unidadId: u.id,
          periodo,
          concepto: CONCEPTO_MANTENIMIENTO,
          monto: u.cuotaMensual,
          fechaVencimiento: vence,
        })),
        tx,
      );
      if (count === 0) {
        throw new ConflictException(
          'Todas las unidades ya tienen cuota para este período',
        );
      }
      return { periodo, creadas: count, omitidas };
    });
  }

  private async planificar(periodo: string, tx?: Prisma.TransactionClient) {
    // Secuencial a propósito: dentro de una transacción no conviene lanzar
    // consultas en paralelo sobre la misma conexión.
    const unidades = await this.repo.unidadesActivas(tx);
    const existentes = await this.repo.unidadesConCuota(periodo, tx);
    return clasificarUnidades(
      unidades.map((u) => ({ ...u, montoValido: u.cuotaMensual.gt(0) })),
      new Set(existentes.map((c) => c.unidadId)),
    );
  }

  /** H1: cuotas de una unidad del residente, con su total pendiente. */
  async misCuotas(user: User, query: ListarMisCuotasDto, ahora = new Date()) {
    soloRoles(user.rol, 'RESIDENTE');
    await this.verificarUnidad(user.id, query.unidadId);
    const hoy = hoyLocal(ahora);
    const where: Prisma.CuotaWhereInput = {
      unidadId: query.unidadId,
      ...(query.periodo ? { periodo: query.periodo } : {}),
      ...filtroEstado(query.estado, hoy),
    };
    const { filas, total, pendiente } = await this.repo.listar(
      where,
      query.unidadId,
      (query.pagina - 1) * query.tamanoPagina,
      query.tamanoPagina,
    );
    return {
      datos: filas.map((cuota) => this.resumen(cuota, hoy)),
      totalPendiente: (pendiente ?? new Prisma.Decimal(0)).toFixed(2),
      total,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    };
  }

  /** H1: detalle de una cuota. Una cuota ajena responde 404, no 403. */
  async detalle(user: User, id: string, ahora = new Date()) {
    soloRoles(user.rol, 'RESIDENTE');
    const cuota = await this.repo.cuotaDeUsuario(id, user.id);
    if (!cuota) throw new NotFoundException('Cuota inexistente');
    return {
      ...this.resumen(cuota, hoyLocal(ahora)),
      unidadId: cuota.unidadId,
      fechaPago: cuota.fechaPago?.toISOString() ?? null,
    };
  }

  /** 404 si la unidad no existe; 403 si existe pero no es del residente. */
  private async verificarUnidad(userId: string, unidadId: string) {
    if (!(await this.repo.unidadExiste(unidadId))) {
      throw new NotFoundException('Unidad inexistente');
    }
    if (!(await this.repo.estaVinculado(userId, unidadId))) {
      throw new ForbiddenException('No tienes acceso a esta unidad');
    }
  }

  private resumen(cuota: Cuota, hoy: Date) {
    return {
      id: cuota.id,
      concepto: cuota.concepto,
      periodo: cuota.periodo,
      monto: cuota.monto.toFixed(2),
      // Fecha de calendario (AAAA-MM-DD), como pide la convención de la API.
      fechaVencimiento: cuota.fechaVencimiento.toISOString().slice(0, 10),
      estado: estadoVisible(cuota.estado, cuota.fechaVencimiento, hoy),
    };
  }
}
