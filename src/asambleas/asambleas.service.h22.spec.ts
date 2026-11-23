import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { AsambleasService } from './asambleas.service.js';
import type { AsambleasRepository } from './asambleas.repository.js';

const admin = { id: 'admin-1', rol: 'ADMINISTRADOR' } as User;
const residente = { id: 'residente-1', rol: 'RESIDENTE' } as User;

const tema = {
  id: 'tema-1',
  pregunta: '¿Aprobamos el proyecto?',
  aperturaAt: new Date('2026-11-01T10:00:00.000Z'),
  cierreAt: new Date('2026-11-01T11:00:00.000Z'),
  asamblea: { estado: 'PUBLICADA' },
  opciones: [
    { id: 'op-si', texto: 'Sí' },
    { id: 'op-no', texto: 'No' },
    { id: 'op-abst', texto: 'Abstención' },
  ],
};

const participaciones = [
  {
    createdAt: new Date('2026-11-01T10:10:00.000Z'),
    unidad: { id: 'unidad-1', codigo: 'A-101' },
    // Simula el dato sensible que el repositorio actualmente incluye.
    opcion: { texto: 'Sí' },
  },
  {
    createdAt: new Date('2026-11-01T10:20:00.000Z'),
    unidad: { id: 'unidad-2', codigo: 'A-102' },
    opcion: { texto: 'No' },
  },
];

const repo = {
  tema: vi.fn(),
  votosPorOpcion: vi.fn(),
  participaciones: vi.fn(),
  unidadesHabilitadas: vi.fn(),
  unidadActivaVinculada: vi.fn(),
  estadoVoto: vi.fn(),
  votar: vi.fn(),
};
let service: AsambleasService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new AsambleasService(repo as unknown as AsambleasRepository);
  repo.tema.mockResolvedValue(tema);
  repo.votosPorOpcion.mockResolvedValue([
    { opcionId: 'op-si', _count: { _all: 2 } },
    { opcionId: 'op-no', _count: { _all: 2 } },
  ]);
  repo.participaciones.mockResolvedValue(participaciones);
  repo.unidadesHabilitadas.mockResolvedValue(10);
});

describe('H22 — resultados auditables', () => {
  it('AC backend: solo permite consultar resultados a administradores', async () => {
    await expect(service.resultados(residente, 'tema-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.tema).not.toHaveBeenCalled();
  });

  it('AC backend: rechaza resultados de un tema inexistente', async () => {
    repo.tema.mockResolvedValue(null);
    await expect(service.resultados(admin, 'no-existe')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('AC backend: no revela resultados antes del cierre ni si la asamblea no está publicada', async () => {
    repo.tema.mockResolvedValue({
      ...tema,
      cierreAt: new Date(Date.now() + 60_000),
    });
    await expect(service.resultados(admin, 'tema-1')).rejects.toBeInstanceOf(ConflictException);

    repo.tema.mockResolvedValue({
      ...tema,
      asamblea: { estado: 'BORRADOR' },
    });
    await expect(service.resultados(admin, 'tema-1')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.votosPorOpcion).not.toHaveBeenCalled();
  });

  it('AC backend: calcula conteos, porcentajes, total y participación', async () => {
    const resultado = await service.resultados(admin, 'tema-1');

    expect(resultado.totalVotos).toBe(4);
    expect(resultado.opciones).toEqual([
      { opcionId: 'op-no', texto: 'No', votos: 2, porcentaje: 50 },
      { opcionId: 'op-si', texto: 'Sí', votos: 2, porcentaje: 50 },
      { opcionId: 'op-abst', texto: 'Abstención', votos: 0, porcentaje: 0 },
    ]);
    expect(resultado.unidadesHabilitadas).toBe(10);
    expect(resultado.participacion).toBe(20);
  });

  it('AC backend: conserva unidades y fechas de participación, pero nunca expone la opción elegida', async () => {
    const resultado = await service.resultados(admin, 'tema-1');

    expect(resultado.unidadesVotantes).toEqual([
      {
        unidadId: 'unidad-1',
        codigo: 'A-101',
        fecha: '2026-11-01T10:10:00.000Z',
      },
      {
        unidadId: 'unidad-2',
        codigo: 'A-102',
        fecha: '2026-11-01T10:20:00.000Z',
      },
    ]);
    expect(resultado.unidadesVotantes).toEqual([
  {
    unidadId: 'unidad-1',
    codigo: 'A-101',
    fecha: '2026-11-01T10:10:00.000Z',
  },
  {
    unidadId: 'unidad-2',
    codigo: 'A-102',
    fecha: '2026-11-01T10:20:00.000Z',
  },
]);

for (const unidad of resultado.unidadesVotantes) {
  expect(unidad).not.toHaveProperty('opcion');
}
  });

  it('AC backend: ordena empates por texto y no declara un ganador', async () => {
    const resultado = await service.resultados(admin, 'tema-1');
    expect(resultado.opciones[0].votos).toBe(resultado.opciones[1].votos);
    expect(resultado.opciones.map((o) => o.texto)).toEqual(['No', 'Sí', 'Abstención']);
    expect(resultado).not.toHaveProperty('ganador');
  });
});
