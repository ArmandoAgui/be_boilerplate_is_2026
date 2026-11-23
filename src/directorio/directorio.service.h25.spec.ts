import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { DirectorioService } from './directorio.service.js';
import type { DirectorioRepository } from './directorio.repository.js';
import type { PreferenciasDirectorioDto } from './directorio.dto.js';

const residente = { id: 'residente-1', rol: 'RESIDENTE' } as User;
const otroResidente = { id: 'residente-2', rol: 'RESIDENTE' } as User;
const admin = { id: 'admin-1', rol: 'ADMINISTRADOR' } as User;

const apagadas: PreferenciasDirectorioDto = {
  visible: false,
  mostrarTelefono: false,
  mostrarCorreo: false,
  mostrarUnidad: false,
};

const repo = {
  obtener: vi.fn(),
  guardar: vi.fn(),
};
let service: DirectorioService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new DirectorioService(repo as unknown as DirectorioRepository);
});

describe('H25 — preferencias de visibilidad del directorio', () => {
  it('AC backend: devuelve todas las preferencias apagadas cuando el usuario aún no tiene configuración', async () => {
    repo.obtener.mockResolvedValue(null);
    await expect(service.obtener(residente)).resolves.toEqual(apagadas);
    expect(repo.obtener).toHaveBeenCalledWith('residente-1');
  });

  it('AC backend: solo permite consultar preferencias a residentes', async () => {
    await expect(service.obtener(admin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.obtener).not.toHaveBeenCalled();
  });

  it('AC backend: guarda las preferencias asociadas al usuario autenticado', async () => {
    const dto = {
      visible: true,
      mostrarTelefono: true,
      mostrarCorreo: false,
      mostrarUnidad: true,
    };
    repo.guardar.mockResolvedValue(dto);

    await expect(service.guardar(residente, dto)).resolves.toEqual(dto);
    expect(repo.guardar).toHaveBeenCalledWith('residente-1', dto);
    expect(repo.guardar).not.toHaveBeenCalledWith('residente-2', expect.anything());
  });

  it('AC backend: fuerza todos los campos a falso cuando visible es falso', async () => {
    repo.guardar.mockResolvedValue(apagadas);
    const intento = {
      visible: false,
      mostrarTelefono: true,
      mostrarCorreo: true,
      mostrarUnidad: true,
    };

    await expect(service.guardar(residente, intento)).resolves.toEqual(apagadas);
    expect(repo.guardar).toHaveBeenCalledWith('residente-1', apagadas);
  });

  it('AC backend: impide que un administrador cambie preferencias', async () => {
    await expect(service.guardar(admin, apagadas)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it('AC backend: cada residente solo puede modificar sus propias preferencias', async () => {
    const dto = { ...apagadas, visible: true, mostrarCorreo: true };
    repo.guardar.mockResolvedValue(dto);

    await service.guardar(residente, dto);
    await service.guardar(otroResidente, dto);

    expect(repo.guardar).toHaveBeenNthCalledWith(1, 'residente-1', dto);
    expect(repo.guardar).toHaveBeenNthCalledWith(2, 'residente-2', dto);
  });
});
