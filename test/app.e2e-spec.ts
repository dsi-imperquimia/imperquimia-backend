import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API: rutas y autenticacion', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  it.each(['/proyectos', '/auth/me', '/herramientas'])('rechaza acceso anonimo a %s', async path => {
    await request(app.getHttpServer()).get(path).expect(401);
  });
  it('valida el cuerpo del login publico', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
  });
});
