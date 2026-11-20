import { describe, expect, it } from 'vitest';
import { puedeLeerIncidencia } from './incidencias-lectura.rules.js';

const residenteAutor = 'f1605411-11bd-4575-9cce-9f55b38dff21';
const residenteAjeno = '0d7c58ec-58ca-4bd7-a038-7d2ba446469b';
const administrador = 'a13f52b3-a79d-45a5-9b52-67089ad737c7';
const seguridadAsignada = '8f317582-0083-486a-9122-b54b0c9202d4';
const seguridadAnterior = '679efabe-179b-4ffc-a7a7-e18f7141f86b';

const alcance = {
  residenteId: residenteAutor,
  responsableId: seguridadAsignada,
};

describe('puedeLeerIncidencia', () => {
  it.each([
    ['residente autor', residenteAutor, 'RESIDENTE', true],
    ['residente distinto', residenteAjeno, 'RESIDENTE', false],
    ['administrador', administrador, 'ADMINISTRADOR', true],
    ['Seguridad actualmente asignada', seguridadAsignada, 'SEGURIDAD', true],
    ['Seguridad anterior', seguridadAnterior, 'SEGURIDAD', false],
    ['Seguridad sin asignación', seguridadAnterior, 'SEGURIDAD', false],
    ['rol no reconocido', administrador, 'OTRO', false],
  ])('evalúa el acceso para %s', (_caso, id, rol, permitido) => {
    expect(puedeLeerIncidencia({ id, rol }, alcance)).toBe(permitido);
  });

  it('niega acceso de Seguridad cuando la incidencia no tiene responsable', () => {
    expect(
      puedeLeerIncidencia(
        { id: seguridadAsignada, rol: 'SEGURIDAD' },
        { residenteId: residenteAutor, responsableId: null },
      ),
    ).toBe(false);
  });
});
