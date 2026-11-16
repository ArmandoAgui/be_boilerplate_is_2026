import { importes } from './importes.js';
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

  /**
   * Una fila por unidad con al menos una cuota vencida, ya ordenadas.
   * H29 pasa `vencimiento` para contar solo las cuotas que vencen en su
   * período; H4 no lo pasa y ve todas las vencidas.
   */
  async calcular(
    ahora = new Date(),
    torreId?: string,
    vencimiento?: { desde: Date; hasta: Date },
  ): Promise<FilaMorosidad[]> {
    const hoy = hoyLocal(ahora);
    const vencidas = filtroEstado('VENCIDA', hoy);
    const filtroVencidas = vencimiento
      ? {
          AND: [
            vencidas,
            {
              fechaVencimiento: {
                gte: vencimiento.desde,
                lte: vencimiento.hasta,
              },
            },
          ],
        }
      : vencidas;
    const grupos = await this.repo.morosidadPorUnidad(filtroVencidas, torreId);
    if (grupos.length === 0) return [];

    const unidades = await this.repo.unidadesConTorre(
      grupos.map((g) => g.unidadId),
    );
    const cuotas = await this.repo.vencidas({
      ...filtroVencidas,
      ...(torreId ? { unidad: { torreId } } : {}),
    });
    const saldos = new Map<string, Prisma.Decimal>();
    for (const c of cuotas)
      saldos.set(
        c.unidadId,
        (saldos.get(c.unidadId) ?? new Prisma.Decimal(0)).add(
          importes(c, ahora).total,
        ),
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
          saldoVencido: (
            saldos.get(g.unidadId) ?? new Prisma.Decimal(0)
          ).toFixed(2),
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
        monto: importes(c, ahora).total.toFixed(2),
        montoBase: c.monto.toFixed(2),
        recargo: importes(c, ahora).recargo.toFixed(2),
        fechaVencimiento: c.fechaVencimiento.toISOString().slice(0, 10),
        diasAtraso: diasEntre(c.fechaVencimiento, hoy),
      })),
    };
  }
}
