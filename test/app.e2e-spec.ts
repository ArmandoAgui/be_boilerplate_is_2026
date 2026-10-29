import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use una base aislada con sufijo _test');
describe.skipIf(!url)('Health HTTP del boilerplate', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'clave-aislada-exclusiva-pruebas-reservas-2026';
    process.env.NODE_ENV = 'test';
    const { AppModule } = await import('../dist/app.module.js');
    const fixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });
  it('GET /api/v1 permanece público', async () => {
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });
  afterAll(async () => {
    await app?.close();
  });
});
