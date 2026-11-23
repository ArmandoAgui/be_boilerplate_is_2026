import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { User } from '@PrismaClient';
import { DirectorioService } from './directorio.service.js';
import type { DirectorioRepository, FilaDirectorio } from './directorio.repository.js';
import type { BuscarDirectorioDto } from './directorio.dto.js';

const residente = { id: 'r0', rol: 'RESIDENTE' } as User;
const admin = { id: 'a0', rol: 'ADMINISTRADOR' } as User;

type Permisos = { mostrarTelefono?: boolean; mostrarCorreo?: boolean; mostrarUnidad?: boolean };
const fila = (
  id: string,
  nombre: string,
  permisos: Permisos = {},
  codigo = 'A-101',
  torre = 'Torre A',
): FilaDirectorio => ({
  id,
  nombre,
  email: `${id}@condominio.test`,
  telefono: '7000-0000',
  preferenciaDirectorio: {
    mostrarTelefono: false,
    mostrarCorreo: false,
    mostrarUnidad: false,
    ...permisos,
  },
  unidades: [{ unidad: { codigo, torre: { nombre: torre } } }],
});
const consulta = (buscar: string, pagina = 1, tamanoPagina = 20): BuscarDirectorioDto => ({
  buscar,
  pagina,
  tamanoPagina,
});

const repo = { visibles: vi.fn(), visible: vi.fn(), obtener: vi.fn(), guardar: vi.fn() };
let service: DirectorioService;
beforeEach(() => {
  vi.clearAllMocks();
  service = new DirectorioService(repo as unknown as DirectorioRepository);
});

describe('H26 directorio — permisos', () => {
  it('rechaza con 403 a un rol distinto de Residente sin consultar datos', async () => {
    await expect(service.buscar(admin, consulta('ana'))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.ficha(admin, 'x')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.visibles).not.toHaveBeenCalled();
    expect(repo.visible).not.toHaveBeenCalled();
  });
});

describe('H26 directorio — privacidad', () => {
  it('sin autorizaciones solo publica id y nombre; teléfono, correo y unidad van en null', async () => {
    repo.visibles.mockResolvedValue([fila('u1', 'Ana Pérez')]);
    const r = await service.buscar(residente, consulta('ana'));
    expect(r.datos).toEqual([
      { id: 'u1', nombre: 'Ana Pérez', telefono: null, correo: null, unidad: null },
    ]);
    const texto = JSON.stringify(r);
    expect(texto).not.toContain('7000-0000');
    expect(texto).not.toContain('u1@condominio.test');
    expect(texto).not.toContain('A-101');
  });
  it('publica solo el campo autorizado', async () => {
    repo.visibles.mockResolvedValue([fila('u1', 'Ana Pérez', { mostrarTelefono: true })]);
    const r = await service.buscar(residente, consulta('ana'));
    expect(r.datos[0]).toEqual({
      id: 'u1',
      nombre: 'Ana Pérez',
      telefono: '7000-0000',
      correo: null,
      unidad: null,
    });
  });
  it('la ficha por ID aplica la misma proyección', async () => {
    repo.visible.mockResolvedValue(fila('u1', 'Ana Pérez', { mostrarCorreo: true }));
    const r = await service.ficha(residente, 'u1');
    expect(r).toEqual({
      id: 'u1',
      nombre: 'Ana Pérez',
      telefono: null,
      correo: 'u1@condominio.test',
      unidad: null,
    });
  });
  it('unidad y torre solo coinciden si el vecino autorizó mostrar su unidad', async () => {
    repo.visibles.mockResolvedValue([
      fila('u1', 'Ana Pérez', { mostrarUnidad: true }),
      fila('u2', 'Beto Gómez', {}),
    ]);
    const porTorre = await service.buscar(residente, consulta('torre a'));
    expect(porTorre.datos.map((d) => d.id)).toEqual(['u1']);
    const porUnidad = await service.buscar(residente, consulta('a-101'));
    expect(porUnidad.datos.map((d) => d.id)).toEqual(['u1']);
    // Por nombre sí aparece, pero sin revelar su unidad.
    const porNombre = await service.buscar(residente, consulta('gomez'));
    expect(porNombre.datos).toEqual([
      { id: 'u2', nombre: 'Beto Gómez', telefono: null, correo: null, unidad: null },
    ]);
  });
});

describe('H26 directorio — búsqueda', () => {
  it('ignora mayúsculas y acentos', async () => {
    repo.visibles.mockResolvedValue([fila('u1', 'Ángela Pérez'), fila('u2', 'María López')]);
    expect((await service.buscar(residente, consulta('angela'))).datos.map((d) => d.id)).toEqual(['u1']);
    expect((await service.buscar(residente, consulta('PEREZ'))).datos.map((d) => d.id)).toEqual(['u1']);
    expect((await service.buscar(residente, consulta('maría'))).datos.map((d) => d.id)).toEqual(['u2']);
    expect((await service.buscar(residente, consulta('LOPEZ'))).datos.map((d) => d.id)).toEqual(['u2']);
  });
  it('coincide por contenido, ordena por nombre y pagina de 20 en 20', async () => {
    const todos = Array.from({ length: 25 }, (_, i) =>
      fila(`u${String(i).padStart(2, '0')}`, `Vecino ${String(24 - i).padStart(2, '0')}`),
    );
    repo.visibles.mockResolvedValue(todos);
    const p1 = await service.buscar(residente, consulta('vecino', 1, 20));
    const p2 = await service.buscar(residente, consulta('vecino', 2, 20));
    expect(p1.total).toBe(25);
    expect(p1.datos).toHaveLength(20);
    expect(p2.datos).toHaveLength(5);
    expect([p1.pagina, p1.tamanoPagina]).toEqual([1, 20]);
    const nombres = [...p1.datos, ...p2.datos].map((d) => d.nombre);
    expect(nombres).toEqual([...nombres].sort());
    expect(nombres[0]).toBe('Vecino 00');
  });
  it('sin coincidencias devuelve lista vacía y total 0', async () => {
    repo.visibles.mockResolvedValue([fila('u1', 'Ana Pérez')]);
    expect(await service.buscar(residente, consulta('zzz'))).toEqual({
      datos: [],
      total: 0,
      pagina: 1,
      tamanoPagina: 20,
    });
  });
});

describe('H26 directorio — ficha oculta', () => {
  it('responde 404 sin datos si el perfil no existe o está oculto', async () => {
    repo.visible.mockResolvedValue(null);
    await expect(service.ficha(residente, 'u9')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.visible).toHaveBeenCalledWith('u9');
  });
});
