import { Prisma } from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ActividadesDiariasService } from './actividades-diarias.service';

const uuid = '00000000-0000-4000-8000-000000000050';

function actividadMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    claveOperacion: uuid,
    proyectoId: 10,
    usuarioId: 5,
    empleadoId: 7,
    fecha: new Date('2026-11-10T00:00:00.000Z'),
    descripcion: 'Instalación de membrana asfáltica en azotea',
    observaciones: null,
    ...overrides,
  };
}

describe('ActividadesDiariasService', () => {
  function setup() {
    const repo = {
      findByClave: jest.fn(),
      findUsuario: jest.fn(),
      findProyecto: jest.fn(),
      existeAsignacionActiva: jest.fn(),
      findProyectosDisponibles: jest.fn(),
      findPorProyecto: jest.fn(),
      crear: jest.fn(),
    };
    return {
      repo,
      service: new ActividadesDiariasService(repo as any),
    };
  }

  it('lista únicamente los proyectos activos donde el usuario es jefe de proyecto (GPRCIMPER-29)', async () => {
    const { repo, service } = setup();
    repo.findUsuario.mockResolvedValue({
      id: 5,
      empleadoId: 7,
      role: { name: 'Jefe de proyecto' },
    });
    repo.findProyectosDisponibles.mockResolvedValue([
      { id: 10, nombre: 'Edificio Central', estado: 'ACTIVO' },
    ]);

    const proyectos = await service.findProyectosDisponibles(5);

    expect(proyectos).toEqual([
      { id: 10, nombre: 'Edificio Central', estado: 'ACTIVO' },
    ]);
    expect(repo.findProyectosDisponibles).toHaveBeenCalledWith(7, false);
  });

  it('registra una actividad diaria para el jefe de proyecto asignado al proyecto activo', async () => {
    const { repo, service } = setup();
    repo.findByClave.mockResolvedValue(null);
    repo.findUsuario.mockResolvedValue({
      id: 5,
      empleadoId: 7,
      role: { name: 'Jefe de proyecto' },
    });
    repo.findProyecto.mockResolvedValue({
      id: 10,
      nombre: 'Edificio Central',
      estado: 'ACTIVO',
      jefeProyectoId: 7,
    });
    repo.crear.mockResolvedValue(actividadMock());

    const resultado = await service.registrar(
      {
        claveOperacion: uuid,
        proyectoId: 10,
        fecha: '2026-11-10',
        descripcion: '  Instalación de membrana asfáltica en azotea  ',
        observaciones: '  Sin contratiempos ',
      },
      5,
    );

    expect(resultado.repetido).toBe(false);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        claveOperacion: uuid,
        proyectoId: 10,
        usuarioId: 5,
        empleadoId: 7,
        descripcion: 'Instalación de membrana asfáltica en azotea',
        observaciones: 'Sin contratiempos',
      }),
    );
  });

  it('devuelve el registro existente con repetido=true al reintentar con la misma claveOperacion', async () => {
    const { repo, service } = setup();
    const existente = actividadMock();
    repo.findByClave.mockResolvedValue(existente);

    const resultado = await service.registrar(
      {
        claveOperacion: uuid,
        proyectoId: 10,
        fecha: '2026-11-10',
        descripcion: 'Instalación de membrana asfáltica en azotea',
      },
      5,
    );

    expect(resultado).toEqual({ actividad: existente, repetido: true });
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza con 409 si la claveOperacion ya pertenece a otro usuario', async () => {
    const { repo, service } = setup();
    repo.findByClave.mockResolvedValue(actividadMock({ usuarioId: 99 }));

    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 10,
          fecha: '2026-11-10',
          descripcion: 'Avance diario',
        },
        5,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza si el proyecto no está activo o no existe', async () => {
    const { repo, service } = setup();
    repo.findByClave.mockResolvedValue(null);
    repo.findUsuario.mockResolvedValue({
      id: 5,
      empleadoId: 7,
      role: { name: 'Administrador' },
    });
    repo.findProyecto.mockResolvedValue(null);

    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 999,
          fecha: '2026-11-10',
          descripcion: 'Avance diario',
        },
        5,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    repo.findProyecto.mockResolvedValue({
      id: 10,
      nombre: 'Obra finalizada',
      estado: 'FINALIZADO',
      jefeProyectoId: null,
    });

    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 10,
          fecha: '2026-11-10',
          descripcion: 'Avance diario',
        },
        5,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza con 403 cuando el usuario no es administrador ni jefe de proyecto asignado', async () => {
    const { repo, service } = setup();
    repo.findByClave.mockResolvedValue(null);
    repo.findUsuario.mockResolvedValue({
      id: 5,
      empleadoId: 7,
      role: { name: 'Jefe de proyecto' },
    });
    repo.findProyecto.mockResolvedValue({
      id: 10,
      nombre: 'Edificio Central',
      estado: 'ACTIVO',
      jefeProyectoId: 2,
    });

    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 10,
          fecha: '2026-11-10',
          descripcion: 'Avance diario',
        },
        5,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('permite registrar al administrador aunque no tenga empleado asignado', async () => {
    const { repo, service } = setup();
    repo.findByClave.mockResolvedValue(null);
    repo.findUsuario.mockResolvedValue({
      id: 1,
      empleadoId: null,
      role: { name: 'Administrador' },
    });
    repo.findProyecto.mockResolvedValue({
      id: 10,
      nombre: 'Edificio Central',
      estado: 'ACTIVO',
      jefeProyectoId: null,
    });
    repo.crear.mockResolvedValue(
      actividadMock({ usuarioId: 1, empleadoId: null }),
    );

    const resultado = await service.registrar(
      {
        claveOperacion: uuid,
        proyectoId: 10,
        fecha: '2026-11-10',
        descripcion: 'Supervisión de obra',
      },
      1,
    );

    expect(resultado.repetido).toBe(false);
    expect(repo.existeAsignacionActiva).not.toHaveBeenCalled();
  });

  it('rechaza fechas futuras', async () => {
    const { repo, service } = setup();

    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 10,
          fecha: '2099-01-01',
          descripcion: 'Actividad futura',
        },
        5,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('resuelve una condición de carrera P2002 devolviendo el registro concurrente del mismo usuario', async () => {
    const { repo, service } = setup();
    const existente = actividadMock();
    repo.findByClave
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existente);
    repo.findUsuario.mockResolvedValue({
      id: 5,
      empleadoId: 7,
      role: { name: 'Técnico' },
    });
    repo.findProyecto.mockResolvedValue({
      id: 10,
      nombre: 'Edificio Central',
      estado: 'ACTIVO',
      jefeProyectoId: 7,
    });
    repo.crear.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.0.0',
      }),
    );

    const resultado = await service.registrar(
      {
        claveOperacion: uuid,
        proyectoId: 10,
        fecha: '2026-11-10',
        descripcion: 'Avance diario',
      },
      5,
    );

    expect(resultado).toEqual({ actividad: existente, repetido: true });
  });
});
