import { describe, expect, it } from 'vitest';
import { Categoria, CampoHistorial, EstadoIncidencia } from '@PrismaClient';
import { IncidenciaDetalleDto } from './incidencia-detalle.dto.js';
import {
  IncidenciaMiaDto,
  ListadoIncidenciasMiasDto,
} from './incidencias-mias.dto.js';

const incidenciaId = '6cbf93f1-8d6d-49c2-9fea-7192cf79f242';
const evidenciaId = '57e40f29-08b1-46c5-a68f-93e1f1d2c93c';
const responsableId = 'feb16373-ffde-49d3-9e81-f421f4297133';
const fecha = new Date('2026-11-14T18:30:00.000Z');

describe('DTOs de lectura H12', () => {
  it('mapea una fila propia a la proyección mínima con fecha UTC', () => {
    expect(
      IncidenciaMiaDto.fromEntity({
        id: incidenciaId,
        codigo: 'INC-0042',
        categoria: Categoria.FUGA,
        createdAt: fecha,
        estado: EstadoIncidencia.ABIERTA,
      }),
    ).toEqual({
      id: incidenciaId,
      codigo: 'INC-0042',
      categoria: Categoria.FUGA,
      creadaAt: '2026-11-14T18:30:00.000Z',
      estado: EstadoIncidencia.ABIERTA,
    });
  });

  it('mantiene total y paginación en un listado vacío', () => {
    expect(
      ListadoIncidenciasMiasDto.fromEntity({
        datos: [],
        total: 0,
        pagina: 3,
        tamanoPagina: 50,
      }),
    ).toEqual({ datos: [], total: 0, pagina: 3, tamanoPagina: 50 });
  });

  it('mapea nulos, evidencia autenticada e historial sin perder UUID ni fecha', () => {
    const resultado = IncidenciaDetalleDto.fromEntity({
      id: incidenciaId,
      codigo: 'INC-0042',
      categoria: Categoria.FUGA,
      descripcion: 'Fuga de agua en el pasillo',
      lugar: 'Torre A-101',
      estado: EstadoIncidencia.ABIERTA,
      prioridad: null,
      responsable: null,
      evidencias: [{ id: evidenciaId }],
      historial: [
        {
          campo: CampoHistorial.ESTADO,
          valorAnterior: null,
          valorNuevo: 'ABIERTA',
          actor: { nombre: 'Rosa Martínez' },
          createdAt: fecha,
        },
        {
          campo: CampoHistorial.RESPONSABLE,
          valorAnterior: null,
          valorNuevo: responsableId,
          actor: { nombre: 'Administrador' },
          createdAt: new Date('2026-11-14T18:31:00.000Z'),
        },
      ],
    });

    expect(resultado).toEqual({
      id: incidenciaId,
      codigo: 'INC-0042',
      categoria: Categoria.FUGA,
      descripcion: 'Fuga de agua en el pasillo',
      lugar: 'Torre A-101',
      estado: EstadoIncidencia.ABIERTA,
      prioridad: null,
      responsable: null,
      evidencias: [
        {
          id: evidenciaId,
          url: `/api/v1/incidencias/${incidenciaId}/evidencias/${evidenciaId}`,
        },
      ],
      historial: [
        {
          campo: CampoHistorial.ESTADO,
          valorAnterior: null,
          valorNuevo: 'ABIERTA',
          actor: 'Rosa Martínez',
          fecha: '2026-11-14T18:30:00.000Z',
        },
        {
          campo: CampoHistorial.RESPONSABLE,
          valorAnterior: null,
          valorNuevo: responsableId,
          actor: 'Administrador',
          fecha: '2026-11-14T18:31:00.000Z',
        },
      ],
    });
  });
});
