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
    nombre: 'Instalación de membrana',
    descripcion: 'Instalación de membrana asfáltica en azotea',
    observaciones: null,
    createdAt: new Date(),
    proyecto: {
      id: 10,
      nombre: 'Edificio Central',
      estado: 'ACTIVO',
      jefeProyectoId: 7,
    },
    ...overrides,
  };
}

describe('ActividadesDiariasService', () => {
  function setup() {
    const repo = {
      findById: jest.fn(),
      findByClave: jest.fn(),
      findUsuario: jest.fn(),
      findProyecto: jest.fn(),
      findProyectosDisponibles: jest.fn(),
      findPorProyecto: jest.fn(),
      findAccesibles: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
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

  it('lista todas las actividades accesibles cuando no se filtra por proyecto', async () => {
    const { repo, service } = setup();
    repo.findUsuario.mockResolvedValue({
      id: 5,
      empleadoId: 7,
      role: { name: 'Jefe de proyecto' },
    });
    repo.findAccesibles.mockResolvedValue([actividadMock()]);

    const lista = await service.findActividades(5);

    expect(lista).toHaveLength(1);
    expect(repo.findAccesibles).toHaveBeenCalledWith(7, false);

    repo.findUsuario.mockResolvedValue({
      id: 1,
      empleadoId: null,
      role: { name: 'Administrador' },
    });
    await service.findActividades(1);
    expect(repo.findAccesibles).toHaveBeenLastCalledWith(null, true);
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
        nombre: '  Instalación de membrana  ',
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
        nombre: 'Instalación de membrana',
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
        nombre: 'Instalación de membrana',
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
          nombre: 'Avance diario',
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
          nombre: 'Avance diario',
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
          nombre: 'Avance diario',
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
          nombre: 'Avance diario',
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
        nombre: 'Supervisión de obra',
        descripcion: 'Supervisión de obra',
      },
      1,
    );

    expect(resultado.repetido).toBe(false);
    expect(repo.crear).toHaveBeenCalled();
  });

  it('rechaza fechas futuras', async () => {
    const { repo, service } = setup();

    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 10,
          fecha: '2099-01-01',
          nombre: 'Actividad futura',
          descripcion: 'Actividad futura',
        },
        5,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza nombre vacío o solo espacios', async () => {
    const { repo, service } = setup();

    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 10,
          fecha: '2026-11-10',
          nombre: '   ',
          descripcion: 'Avance diario',
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
        nombre: 'Avance diario',
        descripcion: 'Avance diario',
      },
      5,
    );

    expect(resultado).toEqual({ actividad: existente, repetido: true });
  });

  describe('actualizar (GPRCIMPER-34)', () => {
    it('permite al jefe de proyecto editar un registro antes de cumplir 48 horas desde su creación', async () => {
      const { repo, service } = setup();
      const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
      repo.findUsuario.mockResolvedValue({
        id: 5,
        empleadoId: 7,
        role: { name: 'Jefe de proyecto' },
      });
      repo.findById.mockResolvedValue(
        actividadMock({ createdAt: hace24Horas }),
      );
      repo.actualizar.mockResolvedValue(
        actividadMock({
          createdAt: hace24Horas,
          descripcion: 'Descripción corregida sin errores ortográficos',
          observaciones: 'Nota técnica actualizada',
        }),
      );

      const actualizada = await service.actualizar(
        1,
        {
          nombre: '  Impermeabilización corregida  ',
          descripcion: '  Descripción corregida sin errores ortográficos  ',
          observaciones: '  Nota técnica actualizada ',
        },
        5,
      );

      expect(actualizada.descripcion).toBe(
        'Descripción corregida sin errores ortográficos',
      );
      expect(repo.actualizar).toHaveBeenCalledWith(1, {
        fecha: undefined,
        nombre: 'Impermeabilización corregida',
        descripcion: 'Descripción corregida sin errores ortográficos',
        observaciones: 'Nota técnica actualizada',
      });
    });

    it('rechaza con 403 al jefe de proyecto si han pasado 48 horas o más desde la creación', async () => {
      const { repo, service } = setup();
      const hace49Horas = new Date(Date.now() - 49 * 60 * 60 * 1000);
      repo.findUsuario.mockResolvedValue({
        id: 5,
        empleadoId: 7,
        role: { name: 'Jefe de proyecto' },
      });
      repo.findById.mockResolvedValue(
        actividadMock({ createdAt: hace49Horas }),
      );

      await expect(
        service.actualizar(
          1,
          {
            nombre: 'Edición fuera de plazo',
            descripcion: 'Intento de edición fuera de plazo',
          },
          5,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza con 403 a un jefe de proyecto que no es el asignado al proyecto del registro', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue({
        id: 9,
        empleadoId: 99,
        role: { name: 'Jefe de proyecto' },
      });
      repo.findById.mockResolvedValue(actividadMock());

      await expect(
        service.actualizar(
          1,
          {
            nombre: 'Edición no autorizada',
            descripcion: 'Edición no autorizada',
          },
          9,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it('permite a administración editar el registro aunque hayan pasado más de 48 horas', async () => {
      const { repo, service } = setup();
      const hace72Horas = new Date(Date.now() - 72 * 60 * 60 * 1000);
      repo.findUsuario.mockResolvedValue({
        id: 1,
        empleadoId: null,
        role: { name: 'Administrador' },
      });
      repo.findById.mockResolvedValue(
        actividadMock({ createdAt: hace72Horas }),
      );
      repo.actualizar.mockResolvedValue(
        actividadMock({
          createdAt: hace72Horas,
          nombre: 'Nombre autorizado por administración',
          descripcion: 'Corrección autorizada por administración',
        }),
      );

      const actualizada = await service.actualizar(
        1,
        {
          nombre: 'Nombre autorizado por administración',
          descripcion: 'Corrección autorizada por administración',
        },
        1,
      );

      expect(actualizada.descripcion).toBe(
        'Corrección autorizada por administración',
      );
      expect(repo.actualizar).toHaveBeenCalled();
    });

    it('permite cambiar el proyecto al editar si el destino está activo y asignado al jefe de proyecto', async () => {
      const { repo, service } = setup();
      const hace2Horas = new Date(Date.now() - 2 * 60 * 60 * 1000);
      repo.findUsuario.mockResolvedValue({
        id: 5,
        empleadoId: 7,
        role: { name: 'Jefe de proyecto' },
      });
      repo.findById.mockResolvedValue(actividadMock({ createdAt: hace2Horas }));
      repo.findProyecto.mockResolvedValue({
        id: 20,
        nombre: 'Bodega Norte',
        estado: 'ACTIVO',
        jefeProyectoId: 7,
      });
      repo.actualizar.mockResolvedValue(
        actividadMock({ proyectoId: 20, createdAt: hace2Horas }),
      );

      const actualizada = await service.actualizar(
        1,
        {
          proyectoId: 20,
          nombre: 'Impermeabilización corregida',
          descripcion: 'Descripción reasignada a otro proyecto',
        },
        5,
      );

      expect(actualizada.proyectoId).toBe(20);
      expect(repo.actualizar).toHaveBeenCalledWith(1, {
        proyectoId: 20,
        fecha: undefined,
        nombre: 'Impermeabilización corregida',
        descripcion: 'Descripción reasignada a otro proyecto',
        observaciones: null,
      });
    });

    it('rechaza con 403 al cambiar a un proyecto donde el usuario no es jefe asignado', async () => {
      const { repo, service } = setup();
      const hace2Horas = new Date(Date.now() - 2 * 60 * 60 * 1000);
      repo.findUsuario.mockResolvedValue({
        id: 5,
        empleadoId: 7,
        role: { name: 'Jefe de proyecto' },
      });
      repo.findById.mockResolvedValue(actividadMock({ createdAt: hace2Horas }));
      repo.findProyecto.mockResolvedValue({
        id: 30,
        nombre: 'Proyecto ajeno',
        estado: 'ACTIVO',
        jefeProyectoId: 99,
      });

      await expect(
        service.actualizar(
          1,
          {
            proyectoId: 30,
            nombre: 'Cambio indebido',
            descripcion: 'Intento de mover actividad',
          },
          5,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza con 400 al cambiar a un proyecto que no está activo', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue({
        id: 1,
        empleadoId: null,
        role: { name: 'Administrador' },
      });
      repo.findById.mockResolvedValue(actividadMock());
      repo.findProyecto.mockResolvedValue({
        id: 40,
        nombre: 'Obra finalizada',
        estado: 'FINALIZADO',
        jefeProyectoId: null,
      });

      await expect(
        service.actualizar(
          1,
          {
            proyectoId: 40,
            nombre: 'Cambio a proyecto cerrado',
            descripcion: 'Intento de asociar a proyecto inactivo',
          },
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('filtrado por rango de fechas (GPRIMPER-43)', () => {
    it('pasa el rango UTC al consultar actividades accesibles y por proyecto', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue({
        id: 5,
        empleadoId: 7,
        role: { name: 'Jefe de proyecto' },
      });
      repo.findAccesibles.mockResolvedValue([actividadMock()]);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        nombre: 'Edificio Central',
        estado: 'ACTIVO',
        jefeProyectoId: 7,
      });
      repo.findPorProyecto.mockResolvedValue([actividadMock()]);

      await service.findActividades(5, undefined, '2026-11-07', '2026-11-14');
      expect(repo.findAccesibles).toHaveBeenCalledWith(7, false, {
        fechaInicio: new Date('2026-11-07T00:00:00.000Z'),
        fechaFin: new Date('2026-11-14T00:00:00.000Z'),
      });

      const paraExportar = await service.findParaExportar(
        5,
        10,
        '2026-11-07',
        undefined,
      );
      expect(repo.findPorProyecto).toHaveBeenCalledWith(10, {
        fechaInicio: new Date('2026-11-07T00:00:00.000Z'),
      });
      expect(paraExportar.filtros).toEqual({
        proyectoNombre: 'Edificio Central',
        fechaInicio: '2026-11-07',
        fechaFin: undefined,
      });
    });

    it('rechaza con 400 cuando fechaInicio es mayor que fechaFin', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue({
        id: 5,
        empleadoId: 7,
        role: { name: 'Jefe de proyecto' },
      });

      await expect(
        service.findActividades(5, undefined, '2026-11-14', '2026-11-01'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findAccesibles).not.toHaveBeenCalled();
    });

    it('rechaza con 400 cuando una fecha del filtro no es válida', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue({
        id: 5,
        empleadoId: 7,
        role: { name: 'Jefe de proyecto' },
      });

      await expect(
        service.findActividades(5, undefined, '2026-02-30', '2026-11-14'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.findAccesibles).not.toHaveBeenCalled();
    });
  });
});
