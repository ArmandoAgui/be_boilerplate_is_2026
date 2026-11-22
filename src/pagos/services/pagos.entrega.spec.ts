import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Prisma, type User } from '@PrismaClient';
import type { CrearPagoDto } from '../dto/pagos.dto.js';
import type {
  CuotaBloqueada,
  PagoConConcepto,
  PagosRepository,
} from '../repositories/pagos.repository.js';
import { resolverPasarela } from './pagos.rules.js';
import { PagosService } from './pagos.service.js';
import { PasarelaSimuladaService } from './pasarela-simulada.service.js';

// H2: criterios de backend (AC4 a AC7). Los de interfaz (AC1 a AC3) están en
// components/cuotas/pagar-cuota.test.tsx del frontend. Usa dobles del
// repositorio: no se conecta a PostgreSQL.

type Fn = (...args: any[]) => any;

const ahora = new Date('2026-11-22T18:00:00Z');
const residente = { id: 'u1', rol: 'RESIDENTE' } as User;
const TARJETA = '4242424242424242';
const CVV = '987';

const cuota = (cambios: Partial<CuotaBloqueada> = {}): CuotaBloqueada => ({
  id: 'c1',
  unidadId: 'un1',
  concepto: 'Cuota de mantenimiento',
  monto: '50.00',
  estado: 'PENDIENTE',
  fechaVencimiento: new Date('2026-12-10T00:00:00Z'),
  recargoAplicado: '0.00',
  ...cambios,
});

const dto = (numeroTarjeta = TARJETA, idempotencyKey = 'k1'): CrearPagoDto => ({
  cuotaId: 'c1',
  numeroTarjeta,
  titular: 'Residente QA',
  vencimiento: '12/28',
  cvv: CVV,
  idempotencyKey,
});

const pago = (cambios: Partial<PagoConConcepto> = {}): PagoConConcepto => ({
  id: 'p1',
  numero: 1,
  referencia: 'PAG-20261122-000001',
  cuotaId: 'c1',
  userId: 'u1',
  monto: new Prisma.Decimal('50.00'),
  ultimos4: '4242',
  idempotencyKey: 'k1',
  estado: 'PROCESANDO',
  motivoRechazo: null,
  createdAt: ahora,
  updatedAt: ahora,
  cuota: { concepto: 'Cuota de mantenimiento' },
  ...cambios,
});

function fixture() {
  const repo = {
    transaccion: jest.fn<Fn>((accion: (tx: unknown) => unknown) => accion({})),
    pagoPorIdempotencia: jest.fn<Fn>().mockResolvedValue(null),
    bloquearCuota: jest.fn<Fn>().mockResolvedValue(cuota()),
    estaVinculado: jest.fn<Fn>().mockResolvedValue(true),
    siguienteNumero: jest.fn<Fn>().mockResolvedValue(1),
    crearPago: jest.fn<Fn>((data: { ultimos4: string }) =>
      Promise.resolve(pago({ ultimos4: data.ultimos4 })),
    ),
    actualizarPago: jest.fn<Fn>((_id: string, data: Partial<PagoConConcepto>) =>
      Promise.resolve(pago(data)),
    ),
    marcarCuotaPagada: jest.fn<Fn>().mockResolvedValue({}),
    pagoDeUsuario: jest.fn<Fn>().mockResolvedValue(null),
  };
  const pasarela = new PasarelaSimuladaService();
  pasarela.esperaMs = 0; // la espera de 2 s se prueba en la interfaz (AC2)
  const service = new PagosService(
    repo as unknown as PagosRepository,
    pasarela,
  );
  return { repo, pasarela, service };
}

let t: ReturnType<typeof fixture>;
beforeEach(() => {
  t = fixture();
});

describe('H2. Pagar una cuota pendiente', () => {
  it('AC4: la pasarela aprueba la tarjeta terminada en 4242', async () => {
    expect(resolverPasarela(TARJETA)).toEqual({
      aprobado: true,
      motivoRechazo: null,
    });
    const r = await t.service.pagar(residente, dto(), ahora);
    expect(r).toMatchObject({ estado: 'APROBADO', motivoRechazo: null });
  });

  it('AC4: rechaza la terminada en 0002 con "Fondos insuficientes"', async () => {
    const r = await t.service.pagar(residente, dto('4000000000000002'), ahora);
    expect(r).toMatchObject({
      estado: 'RECHAZADO',
      motivoRechazo: 'Fondos insuficientes',
    });
  });

  it('AC4: rechaza cualquier otra tarjeta con "Tarjeta no reconocida"', async () => {
    const r = await t.service.pagar(residente, dto('5555555555554444'), ahora);
    expect(r).toMatchObject({
      estado: 'RECHAZADO',
      motivoRechazo: 'Tarjeta no reconocida',
    });
  });

  it('AC5: un pago aprobado marca la cuota como Pagada con fecha de pago', async () => {
    await t.service.pagar(residente, dto(), ahora);
    expect(t.repo.marcarCuotaPagada).toHaveBeenCalledTimes(1);
    const [cuotaId, fechaPago] = t.repo.marcarCuotaPagada.mock.calls[0];
    expect(cuotaId).toBe('c1');
    expect(fechaPago).toEqual(ahora);
  });

  it('AC5: un pago rechazado deja la cuota Pendiente', async () => {
    await t.service.pagar(residente, dto('4000000000000002'), ahora);
    expect(t.repo.marcarCuotaPagada).not.toHaveBeenCalled();
  });

  it('AC6: no guarda el número completo ni el código de seguridad, solo los últimos 4', async () => {
    const r = await t.service.pagar(residente, dto(), ahora);
    const guardado = t.repo.crearPago.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(guardado.ultimos4).toBe('4242');
    expect(guardado).not.toHaveProperty('numeroTarjeta');
    expect(guardado).not.toHaveProperty('cvv');
    const serializado = JSON.stringify([
      guardado,
      t.repo.actualizarPago.mock.calls,
      r,
    ]);
    expect(serializado).not.toContain(TARJETA);
    expect(serializado).not.toContain(CVV);
  });

  it('AC7: no permite pagar una cuota ya Pagada (409)', async () => {
    t.repo.bloquearCuota.mockResolvedValue(cuota({ estado: 'PAGADA' }));
    await expect(
      t.service.pagar(residente, dto(), ahora),
    ).rejects.toMatchObject({ status: 409 });
    expect(t.repo.crearPago).not.toHaveBeenCalled();
  });

  it('AC7: la misma idempotencyKey devuelve el primer resultado sin cobrar de nuevo', async () => {
    t.repo.pagoPorIdempotencia.mockResolvedValue(pago({ estado: 'APROBADO' }));
    const cobrar = jest.spyOn(t.pasarela, 'cobrar');
    const r = await t.service.pagar(residente, dto(), ahora);
    expect(r).toMatchObject({ id: 'p1', estado: 'APROBADO' });
    expect(t.repo.transaccion).not.toHaveBeenCalled();
    expect(cobrar).not.toHaveBeenCalled();
  });

  it('AC7: no permite pagar una cuota de otra unidad (403)', async () => {
    t.repo.estaVinculado.mockResolvedValue(false);
    await expect(
      t.service.pagar(residente, dto(), ahora),
    ).rejects.toMatchObject({ status: 403 });
    expect(t.repo.crearPago).not.toHaveBeenCalled();
  });
});
