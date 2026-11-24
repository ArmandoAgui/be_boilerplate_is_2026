import { describe, expect, it, jest } from '@jest/globals';
import type { PrismaService } from '@Prisma/services';
import { ReservasRepository } from './reservas.repository.js';
function fixture() {
  const reserva = {
    findMany: jest.fn<(...args: any[]) => any>().mockResolvedValue([]),
    count: jest.fn<(...args: any[]) => any>().mockResolvedValue(0),
    updateMany: jest
      .fn<(...args: any[]) => any>()
      .mockResolvedValue({ count: 1 }),
  };
  const db = {
    reserva,
    $transaction: jest.fn(async (promises: Promise<unknown>[]) =>
      Promise.all(promises),
    ),
  };
  const repo = new ReservasRepository(db as unknown as PrismaService);
  return { reserva, repo };
}
describe('H5. Consultar disponibilidad de áreas', () => {
  it('AC4: las canceladas y pendientes no ocupan bloques de disponibilidad', async () => {
    const { reserva, repo } = fixture();
    await repo
      .sesion()
      .ocupadas(
        'area',
        new Date('2026-11-24T18:00Z'),
        new Date('2026-11-24T19:00Z'),
      );
    expect(reserva.findMany).toHaveBeenCalledWith({
      where: {
        areaId: 'area',
        estado: 'CONFIRMADA',
        inicio: { lt: new Date('2026-11-24T19:00Z') },
        fin: { gt: new Date('2026-11-24T18:00Z') },
      },
    });
  });
});
describe('H6. Confirmar una reserva personal', () => {
  it('AC4: el listado filtra por creador y ordena por inicio ascendente', async () => {
    const { reserva, repo } = fixture();
    await repo.mias('propietario', { pagina: 1, tamanoPagina: 20 });
    expect(reserva.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'propietario', estado: undefined, eliminadaAt: null },
        orderBy: [{ inicio: 'asc' }, { id: 'asc' }],
      }),
    );
  });
  it('AC6: el cupo excluye pasadas, canceladas y solicitudes pendientes', async () => {
    const { reserva, repo } = fixture();
    const now = new Date('2026-11-21T18:00Z');
    await repo.sesion().futuras('propietario', now);
    expect(reserva.count).toHaveBeenCalledWith({
      where: {
        userId: 'propietario',
        estado: 'CONFIRMADA',
        inicio: { gt: now },
      },
    });
  });
});
describe('H7. Cancelar una reserva personal', () => {
  it('AC3: el listado conserva todos los estados no eliminados y filtra por creador', async () => {
    const { reserva, repo } = fixture();
    await repo.mias('propietario', { pagina: 1, tamanoPagina: 20 });
    expect(reserva.findMany.mock.calls[0][0].where).toEqual({
      userId: 'propietario',
      estado: undefined,
      eliminadaAt: null,
    });
  });
  it('AC6: el filtro de cancelación incluye exactamente las 24 horas', async () => {
    const { reserva, repo } = fixture();
    const now = new Date('2026-11-21T18:00Z');
    await repo.sesion().cancelar('r', 'propietario', now);
    expect(reserva.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'r',
          userId: 'propietario',
          inicio: { gte: new Date('2026-11-22T18:00Z') },
        }),
      }),
    );
  });
  it('AC7: la escritura condicionada por estado evita doble transición y conserva canceladaAt', async () => {
    const { reserva, repo } = fixture();
    const now = new Date('2026-11-21T18:00Z');
    await repo.sesion().cancelar('r', 'propietario', now);
    expect(reserva.updateMany.mock.calls[0][0]).toMatchObject({
      where: { estado: { in: ['PENDIENTE', 'CONFIRMADA'] } },
      data: { estado: 'CANCELADA', canceladaAt: now },
    });
  });
});
