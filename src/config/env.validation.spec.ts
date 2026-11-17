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
