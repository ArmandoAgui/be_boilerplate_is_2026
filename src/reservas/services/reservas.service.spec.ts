import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ReservasService } from './reservas.service.js';
import { ReservasRepository } from '../repositories/reservas.repository.js';
import { Prisma, type User } from '@PrismaClient';
const residente = { id: 'user', rol: 'RESIDENTE' } as User;
const admin = { id: 'admin', rol: 'ADMINISTRADOR' } as User;
const horarios = Array.from({ length: 7 }, (_, diaSemana) => ({
  diaSemana,
  horaInicio: '06:00',
  horaFin: '22:00',
}));
const data = {
  areaId: 'area',
  inicio: '2026-10-30T18:00:00Z',
  duracionHoras: 1,
  asistentes: 2,
};
const tx = {
  bloquearUsuario: vi.fn(),
  bloquearArea: vi.fn(),
  area: vi.fn(),
  futuras: vi.fn(),
  ocupadas: vi.fn(),
  crear: vi.fn(),
  reserva: vi.fn(),
  cancelar: vi.fn(),
  crearArea: vi.fn(),
  editarArea: vi.fn(),
};
const repo = {
  transaccion: vi.fn(async (fn: (s: typeof tx) => Promise<unknown>) => fn(tx)),
  areas: vi.fn(),
  unidades: vi.fn(),
  mias: vi.fn(),
  traducirDuplicado: ReservasRepository.prototype.traducirDuplicado,
};
let service: ReservasService;
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T18:00:00Z'));
  tx.area.mockResolvedValue({
    id: 'area',
    activa: true,
    capacidad: 40,
    horarios,
  });
  tx.futuras.mockResolvedValue(0);
  tx.ocupadas.mockResolvedValue([]);
  tx.cancelar.mockResolvedValue({ count: 1 });
  service = new ReservasService(repo as unknown as ReservasRepository);
});
afterEach(() => vi.useRealTimers());
describe('ReservasService', () => {
  it('calcula disponibilidad y bloques fuera de horario/pasados', async () => {
    const r = await service.disponibilidad(residente, 'area', '2026-10-29');
    expect(r.bloques).toHaveLength(24);
    expect(r.bloques[11].estado).toBe('FUERA_DE_HORARIO');
    expect(r.bloques[13].estado).toBe('DISPONIBLE');
    expect(r.bloques[22].estado).toBe('FUERA_DE_HORARIO');
  });
  it('calcula bloques ocupados', async () => {
    tx.ocupadas.mockResolvedValue([
      {
        inicio: new Date('2026-10-30T18:00Z'),
        fin: new Date('2026-10-30T20:00Z'),
      },
    ]);
    const r = await service.disponibilidad(residente, 'area', '2026-10-30');
    expect(r.bloques[12].estado).toBe('OCUPADO');
    expect(r.bloques[13].estado).toBe('OCUPADO');
    expect(r.bloques[14].estado).toBe('DISPONIBLE');
  });
  it('crea dentro de transacción y bloquea usuario antes del área', async () => {
    await service.crear(residente, data);
    expect(repo.transaccion).toHaveBeenCalled();
    expect(tx.bloquearUsuario.mock.invocationCallOrder[0]).toBeLessThan(
      tx.bloquearArea.mock.invocationCallOrder[0],
    );
    expect(tx.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user',
        fin: new Date('2026-10-30T19:00Z'),
      }),
    );
  });
  it('reserva sin unidad y atribuye el autor desde la sesión', async () => {
    await service.crear(residente, data);
    expect(tx.bloquearUsuario).toHaveBeenCalledWith('user');
    expect(tx.futuras).toHaveBeenCalledWith('user', expect.any(Date));
    expect(tx.crear.mock.calls[0][0]).not.toHaveProperty('unidadId');
  });
  it('rechaza tercera reserva por usuario', async () => {
    tx.futuras.mockResolvedValue(2);
    await expect(service.crear(residente, data)).rejects.toMatchObject({
      status: 409,
    });
  });
  it('rechaza traslapes', async () => {
    tx.ocupadas.mockResolvedValue([
      { inicio: new Date(data.inicio), fin: new Date('2026-10-30T19:00Z') },
    ]);
    await expect(service.crear(residente, data)).rejects.toThrow(
      'Ese horario ya fue reservado. Elija otro.',
    );
  });
  it('rechaza área inactiva', async () => {
    tx.area.mockResolvedValue({ activa: false });
    await expect(service.crear(residente, data)).rejects.toMatchObject({
      status: 400,
    });
  });
  it('cancela y guarda marca temporal', async () => {
    tx.reserva.mockResolvedValue({ userId: 'user' });
    const result = await service.cancelar(residente, 'reserva');
    expect(result.estado).toBe('CANCELADA');
    expect(result.canceladaAt.toISOString()).toBe('2026-10-29T18:00:00.000Z');
  });
  it('rechaza cancelación inválida o fuera de plazo', async () => {
    tx.reserva.mockResolvedValue({ userId: 'user' });
    tx.cancelar.mockResolvedValue({ count: 0 });
    await expect(service.cancelar(residente, 'r')).rejects.toMatchObject({
      status: 409,
    });
  });
  it('oculta reservas ajenas', async () => {
    tx.reserva.mockResolvedValue(null);
    await expect(service.cancelar(residente, 'r')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('no permite operaciones de residente a administrador', async () => {
    await expect(service.crear(admin, data)).rejects.toMatchObject({
      status: 403,
    });
    await expect(service.cancelar(admin, 'r')).rejects.toMatchObject({
      status: 403,
    });
    expect(() =>
      service.mias(admin, { pagina: 1, tamanoPagina: 20 }),
    ).toThrow();
  });
  it('no permite administrar a residentes', async () => {
    await expect(
      service.guardarArea(residente, {
        nombre: 'Salón',
        capacidad: 10,
        horarios,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('reemplaza horarios dentro de transacción con área bloqueada', async () => {
    await service.guardarArea(admin, { horarios }, 'area');
    expect(tx.bloquearArea).toHaveBeenCalledWith('area');
    expect(tx.editarArea).toHaveBeenCalledWith('area', { horarios });
  });
  it('traduce nombres duplicados a 409', async () => {
    tx.crearArea.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );
    await expect(
      service.guardarArea(admin, { nombre: 'Salón', capacidad: 10, horarios }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
