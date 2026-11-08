import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type User } from '@PrismaClient';
import type { ListarMorosidadDto } from '../dto/cuotas.dto.js';
import { CuotasRepository } from '../repositories/cuotas.repository.js';
import {
  diasEntre,
  filtroEstado,
  hoyLocal,
  ordenarMorosidad,
  soloRoles,
  type FilaMorosidad,
} from './cuotas.rules.js';

/**
 * Cálculo de morosidad. Vive en su propio servicio porque H29 (panel de
 * indicadores) lo reutiliza: así las cifras de ambas pantallas coinciden.
 */
@Injectable()
export class MorosidadService {
  constructor(private readonly repo: CuotasRepository) {}

  /** Una fila por unidad con al menos una cuota vencida, ya ordenadas. */
  async calcular(
    ahora = new Date(),
    torreId?: string,
  ): Promise<FilaMorosidad[]> {
    const hoy = hoyLocal(ahora);
    const grupos = await this.repo.morosidadPorUnidad(
      filtroEstado('VENCIDA', hoy),
      torreId,
    );
    if (grupos.length === 0) return [];

    const unidades = await this.repo.unidadesConTorre(
      grupos.map((g) => g.unidadId),
    );
    const porId = new Map(unidades.map((u) => [u.id, u]));

    const filas = grupos.flatMap((g): FilaMorosidad[] => {
      const unidad = porId.get(g.unidadId);
      const masAntiguo = g._min.fechaVencimiento;
      if (!unidad || !masAntiguo) return [];
      return [
        {
          unidadId: g.unidadId,
          codigo: unidad.codigo,
          torre: unidad.torre.nombre,
          cuotasVencidas: g._count._all,
          saldoVencido: (g._sum.monto ?? new Prisma.Decimal(0)).toFixed(2),
          vencimientoMasAntiguo: masAntiguo.toISOString().slice(0, 10),
          diasAtraso: diasEntre(masAntiguo, hoy),
        },
      ];
    });
    return ordenarMorosidad(filas);
  }

  /** H4: GET /administracion/morosidad */
  async listar(user: User, query: ListarMorosidadDto, ahora = new Date()) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    const filas = await this.calcular(ahora, query.torreId);
    const inicio = (query.pagina - 1) * query.tamanoPagina;
    return {
      datos: filas.slice(inicio, inicio + query.tamanoPagina),
      total: filas.length,
      pagina: query.pagina,
      tamanoPagina: query.tamanoPagina,
    };
  }

  /** H4: GET /administracion/morosidad/:unidadId (panel de detalle). */
  async detalle(user: User, unidadId: string, ahora = new Date()) {
    soloRoles(user.rol, 'ADMINISTRADOR');
    const unidad = await this.repo.unidadConTorre(unidadId);
    if (!unidad) throw new NotFoundException('Unidad inexistente');
    const hoy = hoyLocal(ahora);
    const cuotas = await this.repo.cuotasDeUnidad(
      unidadId,
      filtroEstado('VENCIDA', hoy),
    );
    return {
      unidadId,
      codigo: unidad.codigo,
      cuotas: cuotas.map((c) => ({
        id: c.id,
        periodo: c.periodo,
        monto: c.monto.toFixed(2),
        fechaVencimiento: c.fechaVencimiento.toISOString().slice(0, 10),
        diasAtraso: diasEntre(c.fechaVencimiento, hoy),
      })),
    };
  }
}
