import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { validationExceptionFactory } from '@/common/pipes/validation-exception.factory';
import { EmpleadoController } from './controllers/empleado.controller';
import { EmpleadoService } from './service/empleado.service';
import { EmpleadoRepository } from './repository/empleadoRepository';

describe('Empleados: contrato HTTP de habilidades', () => {
  let app: INestApplication;
  const empleado = {
    id: 41,
    nombreCompleto: 'Empleado de prueba',
    dui: '00000000-0',
    nit: '0000-000000-000-0',
    cargoId: 2,
    activo: true,
    habilidades: [],
  };
  const repo = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [EmpleadoController],
      providers: [
        EmpleadoService,
        { provide: EmpleadoRepository, useValue: repo },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ exceptionFactory: validationExceptionFactory }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findUnique.mockResolvedValue(empleado);
    repo.create.mockResolvedValue(empleado);
    repo.update.mockResolvedValue(empleado);
  });

  afterAll(async () => {
    await app.close();
  });

  it('asigna habilidades desde la ruta específica', async () => {
    await request(app.getHttpServer())
      .patch('/empleados/41/habilidades')
      .send({ habilidadesIds: [7, 12] })
      .expect(200);
    expect(repo.update).toHaveBeenCalledWith(41, {}, [7, 12]);
  });

  it('permite quitar todas las habilidades', async () => {
    await request(app.getHttpServer())
      .patch('/empleados/41/habilidades')
      .send({ habilidadesIds: [] })
      .expect(200);
    expect(repo.update).toHaveBeenCalledWith(41, {}, []);
  });

  it.each([undefined, null, '7', [0], [-1], [1.5], ['7'], [7, 7]])(
    'rechaza una selección inválida (%j) sin escribir',
    async (habilidadesIds) => {
      const response = await request(app.getHttpServer())
        .patch('/empleados/41/habilidades')
        .send({ habilidadesIds })
        .expect(400);
      expect(response.body.message.habilidadesIds).toBeDefined();
      expect(repo.update).not.toHaveBeenCalled();
    },
  );

  it('responde 404 para un empleado inexistente o eliminado', async () => {
    repo.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .patch('/empleados/41/habilidades')
      .send({ habilidadesIds: [7] })
      .expect(404);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('conserva las habilidades si el PATCH general no incluye la selección', async () => {
    await request(app.getHttpServer())
      .patch('/empleados/41')
      .send({ nombreCompleto: 'Nombre actualizado' })
      .expect(200);
    expect(repo.update).toHaveBeenCalledWith(
      41,
      expect.objectContaining({ nombreCompleto: 'Nombre actualizado' }),
      undefined,
    );
  });

  it('filtra las relaciones y campos de solo lectura de una respuesta GET', async () => {
    await request(app.getHttpServer())
      .patch('/empleados/41')
      .send({
        ...empleado,
        id: 999,
        cargo: { id: 2, nombre: 'Técnico' },
        habilidades: [{ habilidadId: 7, habilidad: { id: 7 } }],
        deletedAt: '2026-01-01',
        habilidadesIds: [7],
      })
      .expect(200);
    expect(repo.update).toHaveBeenCalledWith(
      41,
      {
        nombreCompleto: empleado.nombreCompleto,
        dui: empleado.dui,
        nit: empleado.nit,
        cargoId: 2,
        activo: true,
      },
      [7],
    );
  });

  it('crea el empleado con las habilidades seleccionadas', async () => {
    await request(app.getHttpServer())
      .post('/empleados')
      .send({ ...empleado, habilidadesIds: [7] })
      .expect(201);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ nombreCompleto: empleado.nombreCompleto }),
      [7],
    );
    expect(repo.create.mock.calls[0][0]).not.toHaveProperty('habilidades');
  });

  it.each(['post', 'patch'] as const)(
    'rechaza habilidades nulas también al %s del empleado',
    async (method) => {
      const endpoint = method === 'post' ? '/empleados' : '/empleados/41';
      await request(app.getHttpServer())
        [method](endpoint)
        .send({ ...empleado, habilidadesIds: null })
        .expect(400);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    },
  );
});
