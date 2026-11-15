import { Test } from '@nestjs/testing';
import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { validationExceptionFactory } from '@/common/pipes/validation-exception.factory';
import { EmpleadoController } from './controllers/empleado.controller';
import { EmpleadoService, calcularPrioridad } from './service/empleado.service';
import { EmpleadoRepository } from './repository/empleadoRepository';
import { Prisma } from '@gen/prisma/client';

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
    findDocumentConflicts: jest.fn(),
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
    repo.findDocumentConflicts.mockResolvedValue([]);
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

  it.each(['dui', 'nit'] as const)(
    'consulta y responde 409 en el campo %s si el documento ya existe',
    async (field) => {
      repo.findDocumentConflicts.mockResolvedValueOnce([
        {
          dui: field === 'dui' ? empleado.dui : 'otro-dui',
          nit: field === 'nit' ? empleado.nit : 'otro-nit',
        },
      ]);

      const response = await request(app.getHttpServer())
        .post('/empleados')
        .send(empleado)
        .expect(409);

      expect(response.body.message[field]).toEqual([
        `El ${field.toUpperCase()} ya está registrado.`,
      ]);
      expect(repo.findDocumentConflicts).toHaveBeenCalledWith(
        empleado.dui,
        empleado.nit,
      );
      expect(repo.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['sin guion', '000000000'],
    ['con dígito verificador incorrecto', '00000000-1'],
    ['nulo', null],
  ])('rechaza DUI %s al crear sin consultar ni guardar', async (_case, dui) => {
    const response = await request(app.getHttpServer())
      .post('/empleados')
      .send({ ...empleado, dui })
      .expect(400);

    expect(response.body.message.dui).toBeDefined();
    expect(repo.findDocumentConflicts).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it.each([
    ['sin guion', '000000000'],
    ['con dígito verificador incorrecto', '00000000-1'],
    ['nulo', null],
  ])('rechaza DUI %s al actualizar sin escribir', async (_case, dui) => {
    const response = await request(app.getHttpServer())
      .patch('/empleados/41')
      .send({ dui })
      .expect(400);

    expect(response.body.message.dui).toBeDefined();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('acepta un DUI con dígito verificador válido al crear y actualizar', async () => {
    const dui = '01234567-8';

    await request(app.getHttpServer())
      .post('/empleados')
      .send({ ...empleado, dui })
      .expect(201);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ dui }),
      undefined,
    );

    await request(app.getHttpServer())
      .patch('/empleados/41')
      .send({ dui })
      .expect(200);
    expect(repo.update).toHaveBeenCalledWith(
      41,
      expect.objectContaining({ dui }),
      undefined,
    );
  });

  it.each([
    ['formato tradicional incompleto', '0000-000000-000'],
    ['NIT homologado con dígito incorrecto', '00000000-1'],
    ['nulo', null],
  ])('rechaza NIT %s al crear sin consultar ni guardar', async (_case, nit) => {
    const response = await request(app.getHttpServer())
      .post('/empleados')
      .send({ ...empleado, nit })
      .expect(400);

    expect(response.body.message.nit).toBeDefined();
    expect(repo.findDocumentConflicts).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it.each([
    ['formato tradicional incompleto', '0000-000000-000'],
    ['NIT homologado con dígito incorrecto', '00000000-1'],
    ['nulo', null],
  ])('rechaza NIT %s al actualizar sin escribir', async (_case, nit) => {
    const response = await request(app.getHttpServer())
      .patch('/empleados/41')
      .send({ nit })
      .expect(400);

    expect(response.body.message.nit).toBeDefined();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it.each([
    ['tradicional', '0000-000000-000-0'],
    ['homologado con el DUI', '01234567-8'],
  ])('acepta NIT %s al crear y actualizar', async (_case, nit) => {
    const dui = nit.length === 10 ? nit : empleado.dui;

    await request(app.getHttpServer())
      .post('/empleados')
      .send({ ...empleado, dui, nit })
      .expect(201);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ dui, nit }),
      undefined,
    );

    await request(app.getHttpServer())
      .patch('/empleados/41')
      .send({ nit })
      .expect(200);
    expect(repo.update).toHaveBeenCalledWith(
      41,
      expect.objectContaining({ nit }),
      undefined,
    );
  });

  it('vuelve a consultar si aparece un duplicado entre la validación y el guardado', async () => {
    repo.findDocumentConflicts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ dui: empleado.dui, nit: 'otro-nit' }]);
    repo.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/empleados')
      .send(empleado)
      .expect(409);

    expect(response.body.message.dui).toEqual(['El DUI ya está registrado.']);
    expect(repo.findDocumentConflicts).toHaveBeenCalledTimes(2);
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

describe('calcularPrioridad (GPRCIMPER-122, AC1)', () => {
  it('es alta si el proyecto ya empezó o empieza en los próximos 2 días', () => {
    expect(calcularPrioridad(new Date('2026-11-10'), '2026-11-12')).toBe('ALTA');
    expect(calcularPrioridad(new Date('2026-11-12'), '2026-11-12')).toBe('ALTA');
    expect(calcularPrioridad(new Date('2026-11-14'), '2026-11-12')).toBe('ALTA');
  });

  it('es media entre 3 y 7 días antes de empezar', () => {
    expect(calcularPrioridad(new Date('2026-11-15'), '2026-11-12')).toBe('MEDIA');
    expect(calcularPrioridad(new Date('2026-11-19'), '2026-11-12')).toBe('MEDIA');
  });

  it('es baja a más de 7 días de empezar, o sin fecha de inicio', () => {
    expect(calcularPrioridad(new Date('2026-11-20'), '2026-11-12')).toBe('BAJA');
    expect(calcularPrioridad(null, '2026-11-12')).toBe('BAJA');
  });
});

describe('EmpleadoService: mis asignaciones (GPRCIMPER-122)', () => {
  function setup() {
    const repo = {
      findEmpleadoIdPorUsuario: jest.fn(),
      findMisAsignaciones: jest.fn().mockResolvedValue([]),
      findMisProyectosComoJefe: jest.fn().mockResolvedValue([]),
      findMiAsignacionDetalle: jest.fn(),
      findMiProyectoComoJefe: jest.fn().mockResolvedValue(null),
      marcarAsignacionVista: jest.fn(),
    };
    return { repo, service: new EmpleadoService(repo as unknown as EmpleadoRepository) };
  }

  it('rechaza si el usuario no está vinculado a un empleado', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: null });
    await expect(service.misAsignaciones(1)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.miAsignacionDetalle(1, 9)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.marcarAsignacionVista(1, 9)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lista los proyectos asignados con el contador de pendientes', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMisAsignaciones.mockResolvedValue([
      { vistaAt: null, proyecto: { id: 1, nombre: 'Obra A', estado: 'ACTIVO' } },
      { vistaAt: new Date('2026-11-10'), proyecto: { id: 2, nombre: 'Obra B', estado: 'ACTIVO' } },
    ]);
    const resultado = await service.misAsignaciones(1);
    expect(repo.findMisAsignaciones).toHaveBeenCalledWith(5);
    expect(resultado.pendientes).toBe(1);
    expect(resultado.items).toEqual([
      expect.objectContaining({ id: 1, vista: false }),
      expect.objectContaining({ id: 2, vista: true }),
    ]);
  });

  it('da el detalle con el contacto del jefe de proyecto', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMiAsignacionDetalle.mockResolvedValue({
      vistaAt: null,
      proyecto: {
        id: 9,
        nombre: 'Obra A',
        ubicacion: 'San Salvador',
        jefeProyectoId: 1,
        jefeProyecto: { nombreCompleto: 'Ana Jefa', user: { email: 'ana@test.com' } },
        empleados: [],
      },
    });
    const detalle = await service.miAsignacionDetalle(1, 9);
    expect(detalle).toMatchObject({
      id: 9,
      vista: false,
      esJefe: false,
      jefeProyecto: { nombreCompleto: 'Ana Jefa', email: 'ana@test.com' },
    });
    expect(detalle).not.toHaveProperty('jefeProyectoId');
  });

  it('marca esJefe en el detalle cuando el técnico también es el jefe del proyecto', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMiAsignacionDetalle.mockResolvedValue({
      vistaAt: null,
      proyecto: {
        id: 9,
        nombre: 'Obra A',
        jefeProyectoId: 5,
        jefeProyecto: { nombreCompleto: 'Yo mismo', user: { email: null } },
        empleados: [
          { empleadoId: 5, empleado: { nombreCompleto: 'Yo mismo', cargo: null } },
          {
            empleadoId: 7,
            empleado: { nombreCompleto: 'Otro Técnico', cargo: { nombre: 'Técnico de Campo' } },
          },
        ],
      },
    });
    const detalle = await service.miAsignacionDetalle(1, 9);
    expect(detalle.esJefe).toBe(true);
    expect(detalle.equipo).toEqual([
      { nombreCompleto: 'Otro Técnico', cargo: 'Técnico de Campo' },
    ]);
  });

  it('da null como jefe de proyecto si no hay uno asignado', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMiAsignacionDetalle.mockResolvedValue({
      vistaAt: null,
      proyecto: { id: 9, nombre: 'Obra A', jefeProyecto: null, empleados: [] },
    });
    const detalle = await service.miAsignacionDetalle(1, 9);
    expect(detalle.jefeProyecto).toBeNull();
  });

  it('responde 404 si la asignación no existe o no le pertenece', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMiAsignacionDetalle.mockResolvedValue(null);
    await expect(service.miAsignacionDetalle(1, 9)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.marcarAsignacionVista(1, 9)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.marcarAsignacionVista).not.toHaveBeenCalled();
  });

  it('marca la asignación como vista', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMiAsignacionDetalle.mockResolvedValue({
      vistaAt: null,
      proyecto: { id: 9, nombre: 'Obra A', jefeProyecto: null },
    });
    await expect(service.marcarAsignacionVista(1, 9)).resolves.toEqual({ vista: true });
    expect(repo.marcarAsignacionVista).toHaveBeenCalledWith(5, 9);
  });

  it('incluye los proyectos donde el empleado es jefe, marcando esJefe y sin pisar la asignación de técnico', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMisAsignaciones.mockResolvedValue([
      { vistaAt: null, proyecto: { id: 1, nombre: 'Obra A (técnico y jefe)', estado: 'ACTIVO' } },
    ]);
    repo.findMisProyectosComoJefe.mockResolvedValue([
      { id: 1, nombre: 'Obra A (técnico y jefe)', estado: 'ACTIVO' },
      { id: 2, nombre: 'Obra B (solo jefe)', estado: 'ACTIVO' },
    ]);
    const resultado = await service.misAsignaciones(1);
    expect(resultado.items).toEqual([
      expect.objectContaining({ id: 1, esJefe: true, vista: false }),
      expect.objectContaining({ id: 2, esJefe: true, vista: true }),
    ]);
    // Obra B no tiene fila en proyecto_empleados: no cuenta como pendiente.
    expect(resultado.pendientes).toBe(1);
  });

  it('da el detalle de un proyecto donde el empleado solo es jefe (sin fila de técnico)', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMiAsignacionDetalle.mockResolvedValue(null);
    repo.findMiProyectoComoJefe.mockResolvedValue({
      id: 9,
      nombre: 'Obra A',
      jefeProyecto: { nombreCompleto: 'Carlos Jefe', user: { email: 'carlos@test.com' } },
      empleados: [
        { empleadoId: 3, empleado: { nombreCompleto: 'José Técnico', cargo: null } },
      ],
    });
    const detalle = await service.miAsignacionDetalle(1, 9);
    expect(detalle).toMatchObject({
      id: 9,
      vista: true,
      vistaAt: null,
      esJefe: true,
      jefeProyecto: { nombreCompleto: 'Carlos Jefe', email: 'carlos@test.com' },
      equipo: [{ nombreCompleto: 'José Técnico', cargo: null }],
    });
  });

  it('no falla al marcar como vista un proyecto donde el empleado solo es jefe', async () => {
    const { repo, service } = setup();
    repo.findEmpleadoIdPorUsuario.mockResolvedValue({ empleadoId: 5 });
    repo.findMiAsignacionDetalle.mockResolvedValue(null);
    repo.findMiProyectoComoJefe.mockResolvedValue({
      id: 9,
      nombre: 'Obra A',
      jefeProyecto: null,
      empleados: [],
    });
    await expect(service.marcarAsignacionVista(1, 9)).resolves.toEqual({ vista: true });
    expect(repo.marcarAsignacionVista).not.toHaveBeenCalled();
  });
});
