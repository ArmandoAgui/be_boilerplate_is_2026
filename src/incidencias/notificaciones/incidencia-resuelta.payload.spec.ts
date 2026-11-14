import { describe, expect, it } from 'vitest';
import { crearIncidenciaResueltaPayload } from './incidencia-resuelta.payload.js';

describe('crearIncidenciaResueltaPayload', () => {
  it('dirige un aviso determinista solo al residente autor', () => {
    const payload = crearIncidenciaResueltaPayload({
      id: '6cbf93f1-8d6d-49c2-9fea-7192cf79f242',
      codigo: 'INC-0001',
      residenteId: 'd12d97d9-5336-482e-a923-bd803b4aeaf2',
    });

    expect(payload).toEqual({
      destinatario: {
        tipo: 'USUARIO',
        id: 'd12d97d9-5336-482e-a923-bd803b4aeaf2',
      },
      tipoEvento: 'INCIDENCIA_RESUELTA',
      titulo: 'Tu incidencia fue resuelta',
      mensaje: 'Tu incidencia INC-0001 fue resuelta.',
      moduloOrigen: 'INCIDENCIAS',
      referenciaId: '6cbf93f1-8d6d-49c2-9fea-7192cf79f242',
      claveEvento:
        'INCIDENCIA_RESUELTA:6cbf93f1-8d6d-49c2-9fea-7192cf79f242',
    });
  });

  it('mantiene los máximos de longitud del contrato H28', () => {
    const payload = crearIncidenciaResueltaPayload({
      id: '6cbf93f1-8d6d-49c2-9fea-7192cf79f242',
      codigo: 'X'.repeat(100),
      residenteId: 'd12d97d9-5336-482e-a923-bd803b4aeaf2',
    });

    expect(payload.titulo.length).toBeLessThanOrEqual(100);
    expect(payload.mensaje.length).toBeLessThanOrEqual(300);
    expect(payload.claveEvento.length).toBeLessThanOrEqual(120);
  });
});
