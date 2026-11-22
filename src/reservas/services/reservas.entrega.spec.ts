import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { User } from '@PrismaClient';
import { Prisma } from '@PrismaClient';
import { ReservasService } from './reservas.service.js';
import { ReservasRepository } from '../repositories/reservas.repository.js';
const residente = { id: 'residente', rol: 'RESIDENTE' } as User;
const admin = { id: 'admin', rol: 'ADMINISTRADOR' } as User;
const seguridad = { id: 'seguridad', rol: 'SEGURIDAD' } as User;
const horarios = Array.from({ length: 7 }, (_, diaSemana) => ({
  diaSemana,
  horaInicio: '06:00',
  horaFin: '22:00',
}));
const solicitud = {
  areaId: 'area',
  inicio: '2026-11-24T18:00:00Z',
  duracionHoras: 1,
  asistentes: 2,
};
function fixture() {
  const tx = {
    bloquearUsuario: jest.fn<(...args: any[]) => any>(),
    bloquearArea: jest.fn<(...args: any[]) => any>(),
    area: jest
      .fn<(...args: any[]) => any>()
      .mockResolvedValue({ id: 'area', activa: true, capacidad: 30, horarios }),
    ocupadas: jest.fn<(...args: any[]) => any>().mockResolvedValue([]),
    futuras: jest.fn<(...args: any[]) => any>().mockResolvedValue(0),
    tieneDeuda: jest.fn<(...args: any[]) => any>().mockResolvedValue(null),
    crear: jest
      .fn<(...args: any[]) => any>()
      .mockImplementation(async (data) => ({ id: 'r', ...data })),
    reserva: jest
      .fn<(...args: any[]) => any>()
      .mockResolvedValue({ userId: residente.id }),
    cancelar: jest
      .fn<(...args: any[]) => any>()
      .mockResolvedValue({ count: 1 }),
    crearArea: jest.fn<(...args: any[]) => any>(),
    editarArea: jest.fn<(...args: any[]) => any>(),
  };
  const repo = {
    transaccion: jest.fn(async (fn: (arg: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
    areas: jest.fn<(...args: any[]) => any>().mockResolvedValue([]),
    mias: jest.fn<(...args: any[]) => any>(),
    traducirDuplicado: ReservasRepository.prototype.traducirDuplicado,
  };
  return {
    tx,
    repo,
    service: new ReservasService(repo as unknown as ReservasRepository),
  };
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-21T18:00:00Z'));
});
afterEach(() => {
  jest.useRealTimers();
});
describe('H5. Consultar disponibilidad de áreas', () => {
  it('AC4: calcula ocupación y deja libre el bloque cuando no hay reserva confirmada', async () => {
    const { service, tx } = fixture();
    tx.ocupadas.mockResolvedValueOnce([
      {
        inicio: new Date(solicitud.inicio),
        fin: new Date('2026-11-24T19:00Z'),
      },
    ]);
    expect(
      (await service.disponibilidad(residente, 'area', '2026-11-24'))
        .bloques[12].estado,
    ).toBe('OCUPADO');
    expect(
      (await service.disponibilidad(residente, 'area', '2026-11-24'))
        .bloques[12].estado,
    ).toBe('DISPONIBLE');
  });
  it('AC5: no ofrece bloques pasados ni fuera del horario', async () => {
    const { service } = fixture();
    const r = await service.disponibilidad(residente, 'area', '2026-11-21');
    expect(r.bloques[11].estado).toBe('FUERA_DE_HORARIO');
    expect(r.bloques[23].estado).toBe('FUERA_DE_HORARIO');
    expect(r.bloques[13].estado).toBe('DISPONIBLE');
  });
  it('AC6: rechaza fechas fuera del rango y el rol seguridad', async () => {
    const { service } = fixture();
    for (const fecha of ['2026-11-20', '2026-12-22'])
      await expect(
        service.disponibilidad(residente, 'area', fecha),
      ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.disponibilidad(seguridad, 'area', '2026-11-24'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.disponibilidad(admin, 'area', '2026-11-24'),
    ).resolves.toHaveProperty('bloques');
  });
});
describe('H6. Confirmar una reserva personal', () => {
  it('AC5: atribuye al creador autenticado y crea pendiente de aprobación sin unidad (PO)', async () => {
    const { service, tx } = fixture();
    const r = await service.crear(residente, solicitud);
    expect(r).toMatchObject({ userId: residente.id, estado: 'PENDIENTE' });
    expect(tx.crear.mock.calls[0][0]).not.toHaveProperty('unidadId');
  });
  it('AC6: rechaza una tercera reserva futura sin crearla', async () => {
    const { service, tx } = fixture();
    tx.futuras.mockResolvedValue(2);
    await expect(service.crear(residente, solicitud)).rejects.toMatchObject({
      status: 409,
    });
    expect(tx.crear).not.toHaveBeenCalled();
  });
  it('AC7: rechaza asistentes fuera de capacidad, horario y hora fraccionaria', async () => {
    const { service, tx } = fixture();
    for (const cambios of [
      { asistentes: 31 },
      { duracionHoras: 5 },
      { inicio: '2026-11-24T18:30:00Z' },
      { inicio: '2026-11-24T05:00:00Z' },
    ])
      await expect(
        service.crear(residente, { ...solicitud, ...cambios }),
      ).rejects.toMatchObject({ status: 400 });
    expect(tx.crear).not.toHaveBeenCalled();
  });
  it('AC8: rechaza un intervalo confirmado ocupado; la concurrencia real se verifica en integración', async () => {
    const { service, tx } = fixture();
    tx.ocupadas.mockResolvedValue([
      {
        inicio: new Date(solicitud.inicio),
        fin: new Date('2026-11-24T19:00Z'),
      },
    ]);
    await expect(service.crear(residente, solicitud)).rejects.toMatchObject({
      status: 409,
    });
    expect(tx.crear).not.toHaveBeenCalled();
  });
  it('AC7: PO impide reservar con deuda vencida', async () => {
    const { service, tx } = fixture();
    tx.tieneDeuda.mockResolvedValue({ id: 'cuota' });
    await expect(service.crear(residente, solicitud)).rejects.toMatchObject({
      status: 409,
    });
    expect(tx.crear).not.toHaveBeenCalled();
  });
});
describe('H7. Cancelar una reserva personal', () => {
  it('AC4: busca la reserva con el id del creador autenticado', async () => {
    const { service, tx } = fixture();
    await service.cancelar(residente, 'r');
    expect(tx.reserva).toHaveBeenCalledWith('r', residente.id);
    expect(tx.cancelar).toHaveBeenCalledWith(
      'r',
      residente.id,
      expect.any(Date),
    );
  });
  it('AC5: una reserva ajena responde 404 y seguridad recibe 403', async () => {
    const { service, tx } = fixture();
    tx.reserva.mockResolvedValue(null);
    await expect(service.cancelar(residente, 'ajena')).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.cancelar(seguridad, 'r')).rejects.toMatchObject({
      status: 403,
    });
    expect(tx.cancelar).not.toHaveBeenCalled();
  });
  it('AC6: propaga 409 al no poder cancelar por estado o plazo', async () => {
    const { service, tx } = fixture();
    tx.cancelar.mockResolvedValue({ count: 0 });
    await expect(service.cancelar(residente, 'r')).rejects.toMatchObject({
      status: 409,
    });
  });
  it('AC7: guarda fecha de cancelación y rechaza la repetición', async () => {
    const { service, tx } = fixture();
    expect(await service.cancelar(residente, 'r')).toMatchObject({
      estado: 'CANCELADA',
      canceladaAt: new Date(),
    });
    tx.cancelar.mockResolvedValue({ count: 0 });
    await expect(service.cancelar(residente, 'r')).rejects.toMatchObject({
      status: 409,
    });
  });
});
describe('H8. Administrar áreas y horarios', () => {
  it('AC3: solo administración puede guardar y exige franjas válidas', async () => {
    const { service, tx } = fixture();
    await expect(
      service.guardarArea(residente, {
        nombre: 'Área QA',
        capacidad: 10,
        horarios,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.guardarArea(
        admin,
        { horarios: [{ diaSemana: 0, horaInicio: '14:00', horaFin: '12:00' }] },
        'area',
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(tx.editarArea).not.toHaveBeenCalled();
  });
  it('AC4: edita el área sin reescribir reservas confirmadas', async () => {
    const { service, tx } = fixture();
    await service.guardarArea(admin, { capacidad: 5 }, 'area');
    expect(tx.editarArea).toHaveBeenCalledWith('area', { capacidad: 5 });
    expect(tx.crear).not.toHaveBeenCalled();
    expect(tx.cancelar).not.toHaveBeenCalled();
  });
  it('AC5: desactivar conserva las reservas y bloquea nuevas solicitudes', async () => {
    const { service, tx } = fixture();
    await service.guardarArea(admin, { activa: false }, 'area');
    expect(tx.cancelar).not.toHaveBeenCalled();
    tx.area.mockResolvedValue({
      id: 'area',
      activa: false,
      capacidad: 30,
      horarios,
    });
    await expect(service.crear(residente, solicitud)).rejects.toMatchObject({
      status: 400,
    });
  });
  it('AC6: traduce el nombre duplicado a conflicto 409', async () => {
    const { service, tx } = fixture();
    tx.crearArea.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicado', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );
    await expect(
      service.guardarArea(admin, {
        nombre: 'Área QA',
        capacidad: 10,
        horarios,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
