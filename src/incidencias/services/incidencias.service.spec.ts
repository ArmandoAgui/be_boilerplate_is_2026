import { BadRequestException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CrearIncidenciaDto } from '../dto/crear-incidencia.dto.js';
import { IncidenciaEvidenciaNoEncontradaError } from '../errors/incidencias.errors.js';
import type { IncidenciasRepository } from '../repositories/incidencias.repository.js';
import type { EvidenciasStorage } from '../storage/evidencias.storage.js';
import type { IncidenciaLugarService } from './incidencia-lugar.service.js';
import { IncidenciasService } from './incidencias.service.js';

const ids = {
  residente: '876e9a00-b854-42bf-9578-06187b22fb8d',
  vecino: 'a21558bd-986a-4310-9b34-6388570f1dbd',
  admin: '52fa5ec0-7465-4298-b6d4-940427bd6871',
  seguridad: 'e8cd3675-ff02-4974-a98c-d942bddcf041',
  incidencia: 'd244fc83-9442-4e43-9819-c6b877423c31',
  evidencia: '35af9e91-323f-4ee5-9f33-370c49e810c5',
};

const accesoEvidencia = {
  id: ids.evidencia,
  incidenciaId: ids.incidencia,
  ruta: `${ids.evidencia}.jpg`,
  mime: 'image/jpeg',
  tamanoBytes: 20,
  residenteId: ids.residente,
  responsableId: null as string | null,
};

function crearServicio() {
  const repository = {
    createWithInitialHistory: vi.fn(),
    findUserAccess: vi.fn(),
    findEvidenceForRead: vi.fn(),
  };
  const lugar = { validar: vi.fn() };
  const lote = {
    evidencias: [],
    confirmarPersistencia: vi.fn(),
    compensar: vi.fn(),
  };
  const storage = {
    guardarLote: vi.fn().mockResolvedValue(lote),
    abrirLectura: vi
      .fn()
      .mockResolvedValue(Readable.from([Buffer.from('foto')])),
  };
  return {
    service: new IncidenciasService(
      repository as unknown as IncidenciasRepository,
      lugar as unknown as IncidenciaLugarService,
      storage as unknown as EvidenciasStorage,
    ),
    repository,
    lugar,
    storage,
    lote,
  };
}

describe('IncidenciasService', () => {
  let h: ReturnType<typeof crearServicio>;

  beforeEach(() => {
    h = crearServicio();
  });

  it('mapea la respuesta de creación al contrato sin entidad interna', async () => {
    const creadaAt = new Date('2026-11-08T12:34:56.000Z');
    h.repository.createWithInitialHistory.mockResolvedValueOnce({
      id: ids.incidencia,
      codigo: 'INC-10000',
      categoria: 'FUGA',
      estado: 'ABIERTA',
      createdAt: creadaAt,
      evidencias: [{ id: ids.evidencia }],
      residenteId: ids.residente,
      passwordHash: 'no debe salir',
      ruta: 'archivo-privado.jpg',
    });
    const dto = {
      lugarTipo: 'UNIDAD',
      unidadId: '5f880be5-f20a-4b30-9790-7f73f98d9d26',
      categoria: 'FUGA',
      descripcion: 'Hay una fuga de agua',
    } as CrearIncidenciaDto;

    const result = await h.service.crear(ids.residente, dto);

    expect(Object.keys(result).sort()).toEqual(
      ['id', 'codigo', 'estado', 'categoria', 'creadaAt', 'evidencias'].sort(),
    );
    expect(result).toEqual({
      id: ids.incidencia,
      codigo: 'INC-10000',
      estado: 'ABIERTA',
      categoria: 'FUGA',
      creadaAt: creadaAt.toISOString(),
      evidencias: [
        {
          id: ids.evidencia,
          url: `/api/v1/incidencias/${ids.incidencia}/evidencias/${ids.evidencia}`,
        },
      ],
    });
    expect(h.lote.confirmarPersistencia).toHaveBeenCalledOnce();
    expect(h.lote.compensar).not.toHaveBeenCalled();
  });

  it('compensa el lote si falla la transacción y conserva el error original', async () => {
    const errorSql = new Error('fallo de historial');
    h.repository.createWithInitialHistory.mockRejectedValueOnce(errorSql);
    const dto = {
      lugarTipo: 'UNIDAD',
      unidadId: '5f880be5-f20a-4b30-9790-7f73f98d9d26',
      categoria: 'FUGA',
      descripcion: 'Hay una fuga de agua',
    } as CrearIncidenciaDto;

    await expect(h.service.crear(ids.residente, dto)).rejects.toBe(errorSql);
    expect(h.lote.compensar).toHaveBeenCalledWith(errorSql);
    expect(h.lote.confirmarPersistencia).not.toHaveBeenCalled();
  });

  it('rechaza UUID inválidos antes de consultar datos o abrir archivos', async () => {
    await expect(
      h.service.leerEvidencia(ids.residente, 'invalido', ids.evidencia),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.repository.findUserAccess).not.toHaveBeenCalled();
    expect(h.storage.abrirLectura).not.toHaveBeenCalled();
  });

  it.each([
    ['autor residente', ids.residente, 'RESIDENTE', null, true],
    ['administrador', ids.admin, 'ADMINISTRADOR', null, true],
    ['seguridad asignada', ids.seguridad, 'SEGURIDAD', ids.seguridad, true],
    ['vecino de la misma unidad', ids.vecino, 'RESIDENTE', null, false],
    ['seguridad no asignada', ids.seguridad, 'SEGURIDAD', null, false],
  ])(
    'aplica acceso privado: %s',
    async (_caso, userId, rol, responsableId, permitido) => {
      h.repository.findUserAccess.mockResolvedValueOnce({
        isActive: true,
        rol,
      });
      h.repository.findEvidenceForRead.mockResolvedValueOnce({
        ...accesoEvidencia,
        responsableId,
      });

      const lectura = h.service.leerEvidencia(
        userId,
        ids.incidencia,
        ids.evidencia,
      );
      if (permitido) {
        await expect(lectura).resolves.toMatchObject({
          mimeType: 'image/jpeg',
        });
        expect(h.storage.abrirLectura).toHaveBeenCalledWith(
          accesoEvidencia.ruta,
        );
      } else {
        await expect(lectura).rejects.toBeInstanceOf(
          IncidenciaEvidenciaNoEncontradaError,
        );
        expect(h.storage.abrirLectura).not.toHaveBeenCalled();
      }
    },
  );

  it('oculta una pareja incidencia/evidencia que no existe', async () => {
    h.repository.findUserAccess.mockResolvedValueOnce({
      isActive: true,
      rol: 'ADMINISTRADOR',
    });
    h.repository.findEvidenceForRead.mockResolvedValueOnce(null);

    await expect(
      h.service.leerEvidencia(ids.admin, ids.incidencia, ids.evidencia),
    ).rejects.toBeInstanceOf(IncidenciaEvidenciaNoEncontradaError);
    expect(h.storage.abrirLectura).not.toHaveBeenCalled();
  });

  it('rechaza imágenes inválidas antes de escribirlas', async () => {
    const pdf = Buffer.from('%PDF-1.7 fake');
    const archivo = {
      fieldname: 'fotos',
      originalname: 'foto.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: pdf.length,
      buffer: pdf,
      destination: '',
      filename: '',
      path: '',
    } as Express.Multer.File;
    const dto = {
      lugarTipo: 'UNIDAD',
      unidadId: '5f880be5-f20a-4b30-9790-7f73f98d9d26',
      categoria: 'FUGA',
      descripcion: 'Hay una fuga de agua',
    } as CrearIncidenciaDto;

    await expect(
      h.service.crear(ids.residente, dto, [archivo]),
    ).rejects.toBeDefined();
    expect(h.storage.guardarLote).not.toHaveBeenCalled();
  });
});
