import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, type User } from '@PrismaClient';
import { CuotasRepository } from '../repositories/cuotas.repository.js';
import {
  CONCEPTO_MANTENIMIENTO,
  clasificarUnidades,
  fechaVencimiento,
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
}
