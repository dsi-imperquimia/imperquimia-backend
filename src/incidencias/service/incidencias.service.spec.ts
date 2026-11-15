import { Prisma } from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';

const uuid = '00000000-0000-4000-8000-000000000141';

const jefe = { id: 5, empleadoId: 7, role: { name: 'Jefe de proyecto' } };
const admin = { id: 1, empleadoId: null, role: { name: 'Administrador' } };
const otroJefe = { id: 6, empleadoId: 8, role: { name: 'Jefe de proyecto' } };

function incidenciaMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    claveOperacion: uuid,
    proyectoId: 10,
    usuarioId: 5,
    titulo: 'Filtración en losa',
    descripcion: 'Se detectó filtración en la losa del segundo nivel',
    fecha: new Date('2026-11-10T00:00:00.000Z'),
    prioridad: 'MEDIA',
    estado: 'ABIERTA',
    actividadDiariaId: null,
    proyecto: { id: 10, nombre: 'Torre', estado: 'ACTIVO', jefeProyectoId: 7 },
    ...overrides,
  };
}

const dtoBase = {
  claveOperacion: uuid,
  proyectoId: 10,
  titulo: '  Filtración en losa ',
  descripcion: ' Se detectó filtración ',
  fecha: '2026-11-10',
};

describe('IncidenciasService', () => {
  function setup() {
    const repo = {
      findUsuario: jest.fn(),
      findProyecto: jest.fn(),
      findById: jest.fn(),
      findByClave: jest.fn(),
      findMany: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      cambiarEstado: jest.fn(),
      findActividad: jest.fn(),
      findPorIds: jest.fn(),
      reemplazarVinculos: jest.fn(),
    };
    const actividades = { findProyectosDisponibles: jest.fn() };
    return {
      repo,
      actividades,
      service: new IncidenciasService(repo as any, actividades as any),
    };
  }

  describe('registrar (GPRCIMPER-141)', () => {
    it('crea la incidencia recortando textos y con prioridad MEDIA por defecto', async () => {
      const { repo, service } = setup();
      repo.findByClave.mockResolvedValue(null);
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        estado: 'ACTIVO',
        jefeProyectoId: 7,
      });
      repo.crear.mockResolvedValue(incidenciaMock());

      const res = await service.registrar(dtoBase as any, 5);

      expect(res.repetido).toBe(false);
      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Filtración en losa',
          descripcion: 'Se detectó filtración',
          prioridad: 'MEDIA',
          proyectoId: 10,
          usuarioId: 5,
        }),
      );
    });

    it('respeta la prioridad enviada', async () => {
      const { repo, service } = setup();
      repo.findByClave.mockResolvedValue(null);
      repo.findUsuario.mockResolvedValue(admin);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        estado: 'ACTIVO',
        jefeProyectoId: 7,
      });
      repo.crear.mockResolvedValue(incidenciaMock({ prioridad: 'CRITICA' }));

      await service.registrar({ ...dtoBase, prioridad: 'CRITICA' } as any, 1);

      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ prioridad: 'CRITICA' }),
      );
    });

    it('es idempotente con la misma clave de operación y usuario', async () => {
      const { repo, service } = setup();
      repo.findByClave.mockResolvedValue(incidenciaMock());

      const res = await service.registrar(dtoBase as any, 5);

      expect(res.repetido).toBe(true);
      expect(repo.crear).not.toHaveBeenCalled();
    });

    it('rechaza una clave usada por otro usuario', async () => {
      const { repo, service } = setup();
      repo.findByClave.mockResolvedValue(incidenciaMock({ usuarioId: 99 }));

      await expect(service.registrar(dtoBase as any, 5)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rechaza título o descripción vacíos tras recortar', async () => {
      const { service } = setup();
      await expect(
        service.registrar({ ...dtoBase, titulo: '   ' } as any, 5),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza fechas futuras o inválidas', async () => {
      const { service } = setup();
      await expect(
        service.registrar({ ...dtoBase, fecha: '2999-01-01' } as any, 5),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.registrar({ ...dtoBase, fecha: '2026-02-31' } as any, 5),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza a quien no es jefe del proyecto ni administrador', async () => {
      const { repo, service } = setup();
      repo.findByClave.mockResolvedValue(null);
      repo.findUsuario.mockResolvedValue(otroJefe);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        estado: 'ACTIVO',
        jefeProyectoId: 7,
      });

      await expect(service.registrar(dtoBase as any, 6)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rechaza proyectos cancelados y proyectos inexistentes', async () => {
      const { repo, service } = setup();
      repo.findByClave.mockResolvedValue(null);
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findProyecto.mockResolvedValueOnce({
        id: 10,
        estado: 'CANCELADO',
        jefeProyectoId: 7,
      });
      await expect(service.registrar(dtoBase as any, 5)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      repo.findProyecto.mockResolvedValueOnce(null);
      await expect(service.registrar(dtoBase as any, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('resuelve la carrera P2002 devolviendo el registro concurrente', async () => {
      const { repo, service } = setup();
      repo.findByClave
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(incidenciaMock());
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        estado: 'ACTIVO',
        jefeProyectoId: 7,
      });
      repo.crear.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'x',
        }),
      );

      const res = await service.registrar(dtoBase as any, 5);
      expect(res.repetido).toBe(true);
    });
  });

  describe('registrar vinculada a una jornada (GPRCIMPER-142)', () => {
    const actividad = {
      id: 3,
      proyectoId: 10,
      proyecto: { jefeProyectoId: 7 },
    };

    function listo() {
      const ctx = setup();
      ctx.repo.findByClave.mockResolvedValue(null);
      ctx.repo.findUsuario.mockResolvedValue(jefe);
      ctx.repo.findProyecto.mockResolvedValue({
        id: 10,
        estado: 'ACTIVO',
        jefeProyectoId: 7,
      });
      ctx.repo.crear.mockResolvedValue(
        incidenciaMock({ actividadDiariaId: 3 }),
      );
      return ctx;
    }

    it('crea la incidencia ya vinculada al reporte indicado', async () => {
      const { repo, service } = listo();
      repo.findActividad.mockResolvedValue(actividad);

      await service.registrar({ ...dtoBase, actividadDiariaId: 3 } as any, 5);

      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ proyectoId: 10, actividadDiariaId: 3 }),
      );
    });

    it('sin jornada no consulta actividades ni vincula', async () => {
      const { repo, service } = listo();

      await service.registrar(dtoBase as any, 5);

      expect(repo.findActividad).not.toHaveBeenCalled();
      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ actividadDiariaId: undefined }),
      );
    });

    it('rechaza una jornada inexistente o de otro proyecto sin crear nada', async () => {
      const { repo, service } = listo();

      repo.findActividad.mockResolvedValueOnce(null);
      await expect(
        service.registrar({ ...dtoBase, actividadDiariaId: 3 } as any, 5),
      ).rejects.toBeInstanceOf(NotFoundException);

      repo.findActividad.mockResolvedValueOnce({
        ...actividad,
        proyectoId: 99,
      });
      await expect(
        service.registrar({ ...dtoBase, actividadDiariaId: 3 } as any, 5),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.crear).not.toHaveBeenCalled();
    });
  });

  describe('cambiarEstado (GPRCIMPER-141)', () => {
    it('registra el cambio de estado con comentario en el historial', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(incidenciaMock());
      repo.cambiarEstado.mockResolvedValue(
        incidenciaMock({ estado: 'EN_PROCESO' }),
      );

      await service.cambiarEstado(
        1,
        { estado: 'EN_PROCESO', comentario: '  Cuadrilla asignada ' },
        5,
      );

      expect(repo.cambiarEstado).toHaveBeenCalledWith(
        1,
        5,
        'ABIERTA',
        'EN_PROCESO',
        'Cuadrilla asignada',
      );
    });

    it('rechaza cambiar al mismo estado', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(incidenciaMock());

      await expect(
        service.cambiarEstado(1, { estado: 'ABIERTA' }, 5),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.cambiarEstado).not.toHaveBeenCalled();
    });

    it('rechaza a otro jefe y a incidencias inexistentes', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(otroJefe);
      repo.findById.mockResolvedValue(incidenciaMock());
      await expect(
        service.cambiarEstado(1, { estado: 'RESUELTA' }, 6),
      ).rejects.toBeInstanceOf(ForbiddenException);

      repo.findById.mockResolvedValue(null);
      await expect(
        service.cambiarEstado(9, { estado: 'RESUELTA' }, 6),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('actualizar', () => {
    it('actualiza prioridad y textos sin tocar el estado', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(incidenciaMock());
      repo.actualizar.mockResolvedValue(incidenciaMock({ prioridad: 'ALTA' }));

      await service.actualizar(1, { prioridad: 'ALTA', titulo: ' Nuevo ' }, 5);

      expect(repo.actualizar).toHaveBeenCalledWith(1, {
        titulo: 'Nuevo',
        descripcion: 'Se detectó filtración en la losa del segundo nivel',
        prioridad: 'ALTA',
      });
    });
  });

  describe('findAll', () => {
    it('limita al jefe a sus proyectos y deja al administrador ver todo', async () => {
      const { repo, service } = setup();
      repo.findMany.mockResolvedValue([]);

      repo.findUsuario.mockResolvedValue(jefe);
      await service.findAll(5, { estado: 'abierta' });
      expect(repo.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ jefeProyectoId: 7, estado: 'ABIERTA' }),
      );

      repo.findUsuario.mockResolvedValue(admin);
      await service.findAll(1, {});
      expect(repo.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ jefeProyectoId: undefined }),
      );
    });

    it('rechaza estados y prioridades inválidos', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(admin);
      await expect(
        service.findAll(1, { estado: 'CERRADA' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.findAll(1, { prioridad: 'URGENTE' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('vincularAJornada (GPRCIMPER-142)', () => {
    const actividad = {
      id: 3,
      proyectoId: 10,
      proyecto: { jefeProyectoId: 7 },
    };

    it('vincula una o varias incidencias del mismo proyecto', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findActividad.mockResolvedValue(actividad);
      repo.findPorIds.mockResolvedValue([
        { id: 1, proyectoId: 10, actividadDiariaId: null },
        { id: 2, proyectoId: 10, actividadDiariaId: 3 },
      ]);
      repo.reemplazarVinculos.mockResolvedValue([]);

      await service.vincularAJornada(3, [1, 2], 5);

      expect(repo.reemplazarVinculos).toHaveBeenCalledWith(3, [1, 2]);
    });

    it('permite dejar la jornada sin incidencias', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findActividad.mockResolvedValue(actividad);
      repo.reemplazarVinculos.mockResolvedValue([]);

      await service.vincularAJornada(3, [], 5);

      expect(repo.findPorIds).not.toHaveBeenCalled();
      expect(repo.reemplazarVinculos).toHaveBeenCalledWith(3, []);
    });

    it('rechaza incidencias de otro proyecto, ya vinculadas a otra jornada o inexistentes', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findActividad.mockResolvedValue(actividad);

      repo.findPorIds.mockResolvedValueOnce([
        { id: 1, proyectoId: 99, actividadDiariaId: null },
      ]);
      await expect(service.vincularAJornada(3, [1], 5)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      repo.findPorIds.mockResolvedValueOnce([
        { id: 1, proyectoId: 10, actividadDiariaId: 4 },
      ]);
      await expect(service.vincularAJornada(3, [1], 5)).rejects.toBeInstanceOf(
        ConflictException,
      );

      repo.findPorIds.mockResolvedValueOnce([]);
      await expect(service.vincularAJornada(3, [1], 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.reemplazarVinculos).not.toHaveBeenCalled();
    });

    it('solo el jefe de la jornada o un administrador pueden vincular', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(otroJefe);
      repo.findActividad.mockResolvedValue(actividad);

      await expect(service.vincularAJornada(3, [1], 6)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
