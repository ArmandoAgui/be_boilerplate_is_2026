import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  CANTIDAD_MAXIMA_FOTOS_INCIDENCIA,
  MENSAJE_FOTOS_INCIDENCIA_INVALIDAS,
  TAMANO_MAXIMO_FOTO_INCIDENCIA,
  validarFotosIncidencia,
} from './fotos-incidencia.validator.js';

const crearArchivo = (
  buffer: Buffer,
  cambios: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'fotos',
    originalname: 'imagen.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    ...cambios,
  }) as Express.Multer.File;

function agregarComentariosJpegHasta(buffer: Buffer, tamano: number): Buffer {
  let restante = tamano - buffer.length;
  if (restante < 4) throw new Error('No hay espacio para un segmento JPEG.');

  const segmentos: Buffer[] = [];
  while (restante > 0) {
    let tamanoSegmento = Math.min(65_537, restante);
    if (restante - tamanoSegmento > 0 && restante - tamanoSegmento < 4) {
      tamanoSegmento -= 4 - (restante - tamanoSegmento);
    }
    const payload = tamanoSegmento - 4;
    const segmento = Buffer.alloc(tamanoSegmento);
    segmento[0] = 0xff;
    segmento[1] = 0xfe;
    segmento.writeUInt16BE(payload + 2, 2);
    segmentos.push(segmento);
    restante -= tamanoSegmento;
  }

  return Buffer.concat([
    buffer.subarray(0, 2),
    ...segmentos,
    buffer.subarray(2),
  ]);
}

describe('validarFotosIncidencia', () => {
  let jpeg: Buffer;
  let png: Buffer;
  let jpegExactamente5MiB: Buffer;

  beforeAll(async () => {
    const imagen = {
      create: {
        width: 2,
        height: 2,
        channels: 3 as const,
        background: '#3478bf',
      },
    };
    jpeg = await sharp(imagen).jpeg().toBuffer();
    png = await sharp(imagen).png().toBuffer();
    jpegExactamente5MiB = agregarComentariosJpegHasta(
      jpeg,
      TAMANO_MAXIMO_FOTO_INCIDENCIA,
    );
  });

  it('acepta lotes de cero a tres fotos JPEG y PNG auténticas', async () => {
    await expect(validarFotosIncidencia(undefined)).resolves.toEqual([]);
    await expect(validarFotosIncidencia([])).resolves.toEqual([]);

    const lote = await validarFotosIncidencia([
      crearArchivo(jpeg),
      crearArchivo(png, { originalname: 'imagen.png', mimetype: 'image/png' }),
      crearArchivo(jpeg),
    ]);

    expect(
      lote.map(({ mimeType, extension }) => [mimeType, extension]),
    ).toEqual([
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/jpeg', 'jpg'],
    ]);
  });

  it('acepta exactamente 5 MiB cuando el JPEG sigue siendo decodificable', async () => {
    expect(jpegExactamente5MiB).toHaveLength(TAMANO_MAXIMO_FOTO_INCIDENCIA);
    await expect(
      validarFotosIncidencia([crearArchivo(jpegExactamente5MiB)]),
    ).resolves.toMatchObject([{ sizeBytes: TAMANO_MAXIMO_FOTO_INCIDENCIA }]);
  });

  it('determina el MIME por el contenido real, no por el nombre ni el MIME declarado', async () => {
    await expect(
      validarFotosIncidencia([
        crearArchivo(jpeg, {
          originalname: 'imagen.png',
          mimetype: 'image/png',
        }),
      ]),
    ).resolves.toMatchObject([{ mimeType: 'image/jpeg', extension: 'jpg' }]);
  });

  it('rechaza el cuarto archivo con el máximo documentado', async () => {
    await expect(
      validarFotosIncidencia(
        Array.from({ length: 4 }, () => crearArchivo(jpeg)),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: `Se permite un máximo de ${CANTIDAD_MAXIMA_FOTOS_INCIDENCIA} fotos.`,
      }),
    });
  });

  it.each([
    ['archivo vacío', Buffer.alloc(0)],
    ['texto con extensión jpg', Buffer.from('no es una imagen')],
    ['cabecera JPEG truncada', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ['PDF con MIME de imagen', Buffer.from('%PDF-1.7 contenido falso')],
  ])(
    'rechaza %s aunque el nombre o el MIME intenten ocultarlo',
    async (_caso, buffer) => {
      await expect(
        validarFotosIncidencia([
          crearArchivo(buffer, {
            originalname: 'documento.jpg',
            mimetype: 'image/jpeg',
          }),
        ]),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: MENSAJE_FOTOS_INCIDENCIA_INVALIDAS,
        }),
      });
    },
  );

  it('rechaza bytes extra, un campo distinto y una imagen corrupta', async () => {
    await expect(
      validarFotosIncidencia([
        crearArchivo(Buffer.concat([jpegExactamente5MiB, Buffer.from([0])])),
      ]),
    ).rejects.toBeDefined();
    await expect(
      validarFotosIncidencia([crearArchivo(jpeg, { fieldname: 'archivo' })]),
    ).rejects.toBeDefined();
    await expect(
      validarFotosIncidencia([
        crearArchivo(
          Buffer.from([...jpeg.subarray(0, 20), ...Buffer.alloc(40)]),
        ),
      ]),
    ).rejects.toBeDefined();
  });
});
