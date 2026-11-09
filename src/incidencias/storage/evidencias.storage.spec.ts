import { mkdtemp, open, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ErrorAlmacenamientoEvidencias,
  EvidenciasStorage,
  LoteEvidenciasIncidencia,
} from './evidencias.storage.js';

const foto = (contenido: string) => ({
  buffer: Buffer.from(contenido),
  mimeType: 'image/jpeg' as const,
  extension: 'jpg' as const,
  sizeBytes: Buffer.byteLength(contenido),
});

describe('EvidenciasStorage', () => {
  let raizTemporal: string | undefined;

  afterEach(async () => {
    if (raizTemporal) await rm(raizTemporal, { recursive: true, force: true });
    raizTemporal = undefined;
  });

  async function crearStorage() {
    raizTemporal = await mkdtemp(join(tmpdir(), 'h9-evidencias-test-'));
    const config = { get: () => raizTemporal };
    return new EvidenciasStorage(config as never);
  }

  it('escribe con nombre UUID, sin colisión y permisos privados; compensa solo sus archivos', async () => {
    const storage = await crearStorage();
    const lote = await storage.guardarLote([foto('uno'), foto('dos')]);
    const rutas = lote.evidencias.map(({ ruta }) => ruta);

    expect(rutas).toHaveLength(2);
    expect(new Set(rutas).size).toBe(2);
    expect(rutas.every((ruta) => /^[0-9a-f-]{36}\.jpg$/.test(ruta))).toBe(true);
    for (const [i, evidencia] of lote.evidencias.entries()) {
      expect(
        await readFile(
          join(raizTemporal!, 'incidencias', evidencia.ruta),
          'utf8',
        ),
      ).toBe(['uno', 'dos'][i]);
      if (process.platform !== 'win32') {
        expect(
          (await stat(join(raizTemporal!, 'incidencias', evidencia.ruta)))
            .mode & 0o777,
        ).toBe(0o600);
      }
    }

    await lote.compensar(new Error('transacción rechazada'));
    expect(await readdir(join(raizTemporal!, 'incidencias'))).toEqual([]);
  });

  it('no borra el lote después de confirmar la persistencia', async () => {
    const storage = await crearStorage();
    const lote = await storage.guardarLote([foto('conservar')]);
    const ruta = join(raizTemporal!, 'incidencias', lote.evidencias[0]!.ruta);

    lote.confirmarPersistencia();
    await lote.compensar(new Error('error posterior al commit'));

    await expect(readFile(ruta, 'utf8')).resolves.toBe('conservar');
  });

  it('limpia el primer archivo y el archivo parcial si falla la segunda escritura', async () => {
    const storage = await crearStorage();
    type StorageInterno = {
      escribirExclusivo: (
        nombre: string,
        buffer: Buffer,
        nombresPropios: string[],
      ) => Promise<void>;
    };
    const interno = storage as unknown as StorageInterno;
    const escribirOriginal = interno.escribirExclusivo.bind(storage);
    vi.spyOn(interno, 'escribirExclusivo')
      .mockImplementationOnce(escribirOriginal)
      .mockImplementationOnce(async (nombre, _buffer, nombresPropios) => {
        const archivo = await open(
          join(raizTemporal!, 'incidencias', nombre),
          'wx',
          0o600,
        );
        nombresPropios.push(nombre);
        try {
          await archivo.writeFile('contenido parcial');
        } finally {
          await archivo.close();
        }
        throw new Error('fallo inyectado durante la segunda escritura');
      });

    const resultado = await storage
      .guardarLote([foto('primera foto'), foto('segunda foto')])
      .catch((error: unknown) => error);

    expect(resultado).toBeInstanceOf(ErrorAlmacenamientoEvidencias);
    if (!(resultado instanceof ErrorAlmacenamientoEvidencias)) {
      throw new Error('Se esperaba un error de escritura del lote.');
    }
    expect(resultado.causaOriginal).toMatchObject({
      message: 'fallo inyectado durante la segunda escritura',
    });
    expect(await readdir(join(raizTemporal!, 'incidencias'))).toEqual([]);
  });

  it('rechaza traversal y nombres que no tengan UUID generado', async () => {
    const storage = await crearStorage();
    await expect(storage.abrirLectura('../secret.jpg')).rejects.toMatchObject({
      name: 'ArchivoEvidenciaNoDisponibleError',
    });
    await expect(
      storage.abrirLectura('imagen-del-cliente.jpg'),
    ).rejects.toMatchObject({
      name: 'ArchivoEvidenciaNoDisponibleError',
    });
  });

  it('conserva el diagnóstico y los nombres pendientes cuando falla la limpieza', async () => {
    const causa = new Error('fallo SQL');
    const falloLimpieza = new Error('permiso denegado');
    const logger = { error: vi.fn() };
    const lote = new LoteEvidenciasIncidencia(
      [],
      ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'],
      async (nombres) =>
        nombres.map((nombre) => ({ nombre, error: falloLimpieza })),
      logger as never,
    );

    const resultado = await lote
      .compensar(causa)
      .catch((error: unknown) => error);
    expect(resultado).toBeInstanceOf(ErrorAlmacenamientoEvidencias);
    if (!(resultado instanceof ErrorAlmacenamientoEvidencias)) {
      throw new Error('Se esperaba el error de compensación de evidencias.');
    }
    expect(resultado).toMatchObject({
      name: 'ErrorAlmacenamientoEvidencias',
      causaOriginal: causa,
      archivosPendientes: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'],
      erroresLimpieza: [{ error: falloLimpieza }],
    });
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
