import { importes } from '../../cuotas/services/importes.js';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@PrismaClient';
import { soloRoles } from '../../cuotas/services/cuotas.rules.js';
import type { CrearPagoDto } from '../dto/pagos.dto.js';
import {
  PagosRepository,
  type PagoConConcepto,
} from '../repositories/pagos.repository.js';
import {
  referenciaPago,
  ultimos4,
  validarVencimientoTarjeta,
} from './pagos.rules.js';
import { PasarelaSimuladaService } from './pasarela-simulada.service.js';

export interface PagoRespuesta {
  id: string;
  referencia: string;
  estado: PagoConConcepto['estado'];
  cuotaId: string;
  concepto: string;
  monto: string;
  ultimos4: string;
  fecha: string;
  motivoRechazo: string | null;
}

@Injectable()
export class PagosService {
  constructor(
    private readonly repo: PagosRepository,
    private readonly pasarela: PasarelaSimuladaService,
  ) {}

  /** H2: POST /pagos. */
  async pagar(
    user: User,
    dto: CrearPagoDto,
    ahora = new Date(),
  ): Promise<PagoRespuesta> {
    soloRoles(user.rol, 'RESIDENTE');
    validarVencimientoTarjeta(dto.vencimiento, ahora);

    // Reintento de la misma solicitud (doble clic, red lenta): se devuelve
    // el primer resultado sin volver a cobrar.
    const previo = await this.repo.pagoPorIdempotencia(dto.idempotencyKey);
    if (previo) return this.repetido(previo, user, dto);

    try {
      return await this.repo.transaccion(async (tx) => {
        const cuota = await this.repo.bloquearCuota(dto.cuotaId, tx);
        if (!cuota) throw new NotFoundException('Cuota inexistente');
        if (!(await this.repo.estaVinculado(user.id, cuota.unidadId, tx))) {
          throw new ForbiddenException('No tienes acceso a esta cuota');
        }
        // Una solicitud simultánea con la misma clave pudo terminar mientras
        // esta esperaba el bloqueo de la cuota.
        const yaPagado = await this.repo.pagoPorIdempotencia(
          dto.idempotencyKey,
          tx,
        );
        if (yaPagado) return this.repetido(yaPagado, user, dto);
        if (cuota.estado !== 'PENDIENTE') {
          throw new ConflictException('La cuota ya está pagada o fue anulada');
        }

        const numero = await this.repo.siguienteNumero(tx);
        const pago = await this.repo.crearPago(
          {
            numero,
            referencia: referenciaPago(ahora, numero),
            cuotaId: cuota.id,
            userId: user.id,
            monto: importes(cuota, ahora).total,
            ultimos4: ultimos4(dto.numeroTarjeta),
            idempotencyKey: dto.idempotencyKey,
            estado: 'PROCESANDO',
          },
          tx,
        );

        const resultado = await this.pasarela.cobrar(dto.numeroTarjeta);
        const final = await this.repo.actualizarPago(
          pago.id,
          {
            estado: resultado.aprobado ? 'APROBADO' : 'RECHAZADO',
            motivoRechazo: resultado.motivoRechazo,
          },
          tx,
        );
        if (resultado.aprobado) {
          await this.repo.marcarCuotaPagada(
            cuota.id,
            ahora,
            tx,
            importes(cuota, ahora).recargo,
          );
        }
        return this.respuesta(final);
      });
    } catch (error) {
      // Dos solicitudes con la misma clave para cuotas distintas: la base
      // rechaza la segunda por la restricción única de idempotencyKey.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existente = await this.repo.pagoPorIdempotencia(
          dto.idempotencyKey,
        );
        if (existente) return this.repetido(existente, user, dto);
      }
      throw error;
    }
  }

  /** H2: GET /pagos/:id (comprobante). */
  async detalle(user: User, id: string): Promise<PagoRespuesta> {
    soloRoles(user.rol, 'RESIDENTE');
    const pago = await this.repo.pagoDeUsuario(id, user.id);
    if (!pago) throw new NotFoundException('Pago inexistente');
    return this.respuesta(pago);
  }

  /**
   * La misma clave solo vale para el mismo usuario y la misma cuota; usarla
   * para otra operación es un conflicto, no un reintento.
   */
  private repetido(
    pago: PagoConConcepto,
    user: User,
    dto: CrearPagoDto,
  ): PagoRespuesta {
    if (pago.userId !== user.id || pago.cuotaId !== dto.cuotaId) {
      throw new ConflictException(
        'La clave de idempotencia ya se usó en otra operación',
      );
    }
    return this.respuesta(pago);
  }

  private respuesta(pago: PagoConConcepto): PagoRespuesta {
    return {
      id: pago.id,
      referencia: pago.referencia,
      estado: pago.estado,
      cuotaId: pago.cuotaId,
      concepto: pago.cuota.concepto,
      monto: pago.monto.toFixed(2),
      ultimos4: pago.ultimos4,
      fecha: pago.createdAt.toISOString(),
      motivoRechazo: pago.motivoRechazo,
    };
  }
}
