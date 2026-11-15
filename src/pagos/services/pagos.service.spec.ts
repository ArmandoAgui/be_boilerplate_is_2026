import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@PrismaClient';
import type { CrearPagoDto } from '../dto/pagos.dto.js';
import type {
  CuotaBloqueada,
  PagoConConcepto,
  PagosRepository,
} from '../repositories/pagos.repository.js';
import { PagosService } from './pagos.service.js';
import { PasarelaSimuladaService } from './pasarela-simulada.service.js';

const ahora = new Date('2026-11-14T18:00:00Z');
const residente = { id: 'u1', rol: 'RESIDENTE' } as User;
const cuotaPendiente: CuotaBloqueada = {
  id: 'c1',
  unidadId: 'un1',
  concepto: 'Cuota de mantenimiento',
  monto: '50.00',
  estado: 'PENDIENTE',
};
const dto = (numeroTarjeta = '4242424242424242'): CrearPagoDto => ({
  cuotaId: 'c1',
  numeroTarjeta,
  titular: 'Rosa Martínez',
  vencimiento: '12/27',
  cvv: '123',
  idempotencyKey: 'k1',
});
const pago = (cambios: Partial<PagoConConcepto> = {}): PagoConConcepto => ({
  id: 'p1',
  numero: 1,
  referencia: 'PAG-20261114-000001',
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

let repo: {
  [K in keyof PagosRepository]: ReturnType<typeof vi.fn>;
};
let service: PagosService;

beforeEach(() => {
  repo = {
    transaccion: vi.fn((accion: (tx: unknown) => unknown) => accion({})),
    pagoPorIdempotencia: vi.fn().mockResolvedValue(null),
    bloquearCuota: vi.fn().mockResolvedValue(cuotaPendiente),
    estaVinculado: vi.fn().mockResolvedValue(true),
    siguienteNumero: vi.fn().mockResolvedValue(1),
    crearPago: vi.fn((data: { ultimos4: string }) =>
      Promise.resolve(pago({ ultimos4: data.ultimos4 })),
    ),
    actualizarPago: vi.fn((_id: string, data: Partial<PagoConConcepto>) =>
      Promise.resolve(pago(data)),
    ),
    marcarCuotaPagada: vi.fn().mockResolvedValue({}),
    pagoDeUsuario: vi.fn().mockResolvedValue(null),
  } as never;
  const pasarela = new PasarelaSimuladaService();
  pasarela.esperaMs = 0;
  service = new PagosService(repo as unknown as PagosRepository, pasarela);
});

describe('H2: pagar una cuota', () => {
  it('aprueba, marca la cuota como pagada y devuelve el comprobante', async () => {
    const r = await service.pagar(residente, dto(), ahora);
    expect(r).toMatchObject({
      estado: 'APROBADO',
      referencia: 'PAG-20261114-000001',
      monto: '50.00',
      ultimos4: '4242',
      motivoRechazo: null,
    });
    expect(repo.marcarCuotaPagada).toHaveBeenCalledWith(
      'c1',
      expect.any(Date),
      expect.anything(),
    );
  });

  it('guarda solo los últimos 4 dígitos, nunca la tarjeta ni el CVV', async () => {
    await service.pagar(residente, dto(), ahora);
    const guardado = JSON.stringify(repo.crearPago.mock.calls[0][0]);
    expect(guardado).toContain('"ultimos4":"4242"');
    expect(guardado).not.toContain('4242424242424242');
    expect(guardado).not.toContain('"cvv"');
    expect(guardado).not.toContain('123');
  });

  it('un rechazo deja la cuota pendiente y devuelve el motivo', async () => {
    const r = await service.pagar(residente, dto('4000000000000002'), ahora);
    expect(r.estado).toBe('RECHAZADO');
    expect(r.motivoRechazo).toBe('Fondos insuficientes');
    expect(repo.marcarCuotaPagada).not.toHaveBeenCalled();
  });

  it('la misma idempotencyKey devuelve el primer resultado sin cobrar', async () => {
    repo.pagoPorIdempotencia.mockResolvedValue(pago({ estado: 'APROBADO' }));
    const r = await service.pagar(residente, dto(), ahora);
    expect(r.estado).toBe('APROBADO');
    expect(repo.transaccion).not.toHaveBeenCalled();
    expect(repo.crearPago).not.toHaveBeenCalled();
  });

  it('rechaza con 409 una cuota ya pagada', async () => {
    repo.bloquearCuota.mockResolvedValue({
      ...cuotaPendiente,
      estado: 'PAGADA',
    });
    await expect(service.pagar(residente, dto(), ahora)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rechaza con 403 una cuota de otra unidad', async () => {
    repo.estaVinculado.mockResolvedValue(false);
    await expect(service.pagar(residente, dto(), ahora)).rejects.toThrow(
      ForbiddenException,
    );
    expect(repo.crearPago).not.toHaveBeenCalled();
  });

  it('rechaza con 404 una cuota inexistente', async () => {
    repo.bloquearCuota.mockResolvedValue(null);
    await expect(service.pagar(residente, dto(), ahora)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza con 403 a un rol distinto de Residente', async () => {
    const admin = { id: 'a1', rol: 'ADMINISTRADOR' } as User;
    await expect(service.pagar(admin, dto(), ahora)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rechaza con 409 una clave usada para otra cuota', async () => {
    repo.pagoPorIdempotencia.mockResolvedValue(pago({ cuotaId: 'otra' }));
    await expect(service.pagar(residente, dto(), ahora)).rejects.toThrow(
      'La clave de idempotencia ya se usó en otra operación',
    );
  });
});

describe('H2: comprobante', () => {
  it('responde 404 si el pago no es del usuario', async () => {
    await expect(service.detalle(residente, 'p9')).rejects.toThrow(
      NotFoundException,
    );
  });
});
