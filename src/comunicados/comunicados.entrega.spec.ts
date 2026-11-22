import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { User } from '@PrismaClient';
import type { PrismaService } from '@Prisma/services';
import { ComunicadosService } from './comunicados.service.js';
import {
  ComunicadosRepository,
  residentesAlcance,
} from './comunicados.repository.js';
import type { AvisosComunicados } from './avisos-comunicados.service.js';
import { CrearComunicadoDto } from './comunicados.dto.js';
const admin = { id: 'admin', rol: 'ADMINISTRADOR' } as User;
const residente = { id: 'residente', rol: 'RESIDENTE' } as User;
const dto = {
  titulo: 'Aviso QA',
  contenido: 'Mantenimiento programado',
  alcance: 'TODOS' as const,
};
const fecha = new Date('2026-10-01T18:00Z');
const comunicado = {
  id: 'c1',
  titulo: dto.titulo,
  contenido: dto.contenido,
  alcance: 'TODOS',
  createdAt: fecha,
};
function fixture() {
  const tx = {
    user: { count: jest.fn<(...args: any[]) => any>().mockResolvedValue(2) },
    torre: {
      findUnique: jest.fn<(...args: any[]) => any>().mockResolvedValue(null),
    },
    seccion: {
      findUnique: jest.fn<(...args: any[]) => any>().mockResolvedValue(null),
    },
    comunicado: {
      create: jest.fn<(...args: any[]) => any>().mockResolvedValue(comunicado),
      findMany: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue([comunicado]),
      findFirst: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue(comunicado),
      count: jest.fn<(...args: any[]) => any>().mockResolvedValue(1),
    },
  };
  const db = {
    $transaction: jest.fn(async (fn: (arg: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };
  const repo = new ComunicadosRepository(db as unknown as PrismaService);
  const avisos = {
    crear: jest.fn<(...args: any[]) => any>().mockResolvedValue({}),
  };
  const service = new ComunicadosService(
    repo,
    avisos as unknown as AvisosComunicados,
  );
  return { tx, db, repo, avisos, service };
}
beforeEach(() => {
  jest.clearAllMocks();
});
describe('H23. Publicar comunicado segmentado', () => {
  it('AC3: el listado administrativo incluye publicación y audiencia sin métricas de lectura', async () => {
    const { service } = fixture();
    const r = await service.administracion(admin, {
      pagina: 1,
      tamanoPagina: 10,
    });
    expect(r.datos[0]).toMatchObject({
      titulo: dto.titulo,
      creadoAt: fecha,
      destinatarios: 2,
    });
    expect(r.datos[0]).not.toHaveProperty('leidos');
    expect(r.datos[0]).not.toHaveProperty('confirmaciones');
  });
  it('AC4: publica directamente y un fallo del avisador no elimina la publicación', async () => {
    const { service, tx, avisos } = fixture();
    avisos.crear.mockRejectedValue(new Error('Fallo H28 simulado'));
    expect(await service.crear(admin, dto)).toMatchObject({ id: 'c1' });
    expect(tx.comunicado.create).toHaveBeenCalledTimes(1);
  });
  it('AC5: genera COMUNICADO_NUEVO con referencia, clave de deduplicación y audiencia', async () => {
    const { service, avisos } = fixture();
    await service.crear(admin, dto);
    expect(avisos.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEvento: 'COMUNICADO_NUEVO',
        destinatario: { tipo: 'TODOS' },
        referenciaId: 'c1',
        claveEvento: 'COMUNICADO_NUEVO:c1',
      }),
    );
  });
  it('AC6: publicación y listado no requieren confirmaciones de lectura', async () => {
    const { service, tx } = fixture();
    await service.crear(admin, dto);
    const guardado = tx.comunicado.create.mock.calls[0][0];
    expect(guardado.data).toMatchObject({
      autorId: admin.id,
      titulo: dto.titulo,
    });
    expect(guardado.data).not.toHaveProperty('leido');
    expect(guardado.data).not.toHaveProperty('lecturas');
  });
  it('AC7: rechaza textos vacíos, límites excedidos y destino requerido ausente', () => {
    for (const datos of [
      { ...dto, titulo: '' },
      { ...dto, titulo: 'x'.repeat(101) },
      { ...dto, contenido: '' },
      { ...dto, contenido: 'x'.repeat(2001) },
      { ...dto, alcance: 'TORRE' },
    ])
      expect(
        validateSync(plainToInstance(CrearComunicadoDto, datos)).length,
      ).toBeGreaterThan(0);
  });
  it('AC7: destino inexistente responde 404 y no guarda publicación ni avisa', async () => {
    const { service, tx, avisos } = fixture();
    await expect(
      service.crear(admin, {
        ...dto,
        alcance: 'TORRE',
        destinoId: '00000000-0000-4000-8000-000000000001',
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(tx.comunicado.create).not.toHaveBeenCalled();
    expect(avisos.crear).not.toHaveBeenCalled();
  });
  it('AC8: residente y seguridad no pueden publicar', async () => {
    const { service, tx } = fixture();
    for (const user of [residente, { ...residente, rol: 'SEGURIDAD' } as User])
      await expect(service.crear(user, dto)).rejects.toMatchObject({
        status: 403,
      });
    expect(tx.comunicado.create).not.toHaveBeenCalled();
  });
});
describe('H24. Consultar comunicados relevantes', () => {
  it('AC3: la selección considera todas las unidades del residente y no solo su primer vínculo', async () => {
    const { service, tx } = fixture();
    await service.mios(residente, { pagina: 1, tamanoPagina: 10 });
    const args = tx.comunicado.findMany.mock.calls[0][0];
    expect(args.where.OR).toEqual([
      { alcance: 'TODOS' },
      {
        alcance: 'TORRE',
        torre: {
          unidades: { some: { usuarios: { some: { userId: residente.id } } } },
        },
      },
      {
        alcance: 'SECCION',
        seccion: {
          unidades: { some: { usuarios: { some: { userId: residente.id } } } },
        },
      },
    ]);
    expect(residentesAlcance('TORRE', 't2')).toMatchObject({
      isActive: true,
      unidades: { some: { unidad: { torreId: 't2' } } },
    });
  });
  it('AC4: entrega publicaciones anteriores sin imponer filtro por fecha de ingreso', async () => {
    const { service, tx } = fixture();
    const r = await service.mios(
      { ...residente, createdAt: new Date('2026-11-21') } as User,
      { pagina: 1, tamanoPagina: 10 },
    );
    expect(r.datos[0].creadoAt).toEqual(fecha);
    expect(
      JSON.stringify(tx.comunicado.findMany.mock.calls[0][0].where),
    ).not.toContain('createdAt');
  });
  it('AC5: consultas repetidas del detalle devuelven contenido sin escrituras', async () => {
    const { service, tx } = fixture();
    for (let i = 0; i < 2; i++)
      expect(await service.detalle(residente, 'c1')).toMatchObject({
        contenido: dto.contenido,
      });
    expect(tx.comunicado.create).not.toHaveBeenCalled();
    expect(tx.comunicado.findFirst).toHaveBeenCalledTimes(2);
  });
  it('AC6: un id fuera de audiencia produce 404', async () => {
    const { service, tx } = fixture();
    tx.comunicado.findFirst.mockResolvedValue(null);
    await expect(service.detalle(residente, 'ajeno')).rejects.toMatchObject({
      status: 404,
    });
    expect(tx.comunicado.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'ajeno', OR: expect.any(Array) }),
      }),
    );
  });
});
