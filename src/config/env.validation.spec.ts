import { describe, it, expect } from 'vitest';
import { validateEnv } from './env.validation.js';

describe('Tarifa configurada', () => {
  it('conserva el monto validado para ConfigModule', () => {
    expect(
      validateEnv({
        DATABASE_URL: 'postgresql://localhost/test',
        JWT_SECRET: 'x'.repeat(32),
        CUOTA_MENSUAL_USD: '73.25',
      }).CUOTA_MENSUAL_USD,
    ).toBe('73.25');
  });
});

describe('Origen público permitido', () => {
  const base = {
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_SECRET: 'x'.repeat(32),
  };
  it('conserva un único origen HTTPS con puerto', () => {
    expect(
      validateEnv({ ...base, CORS_ORIGIN: 'https://localhost:8443' })
        .CORS_ORIGIN,
    ).toBe('https://localhost:8443');
  });
  it('rechaza comodines, rutas y credenciales', () => {
    for (const origin of [
      '*',
      'https://example.test/ruta',
      'https://user:pass@example.test',
    ])
      expect(() => validateEnv({ ...base, CORS_ORIGIN: origin })).toThrow();
  });
});
