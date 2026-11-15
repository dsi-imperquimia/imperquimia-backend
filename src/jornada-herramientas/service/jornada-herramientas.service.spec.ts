import { Prisma } from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JornadaHerramientasService } from './jornada-herramientas.service';

const uuid = '00000000-0000-4000-8000-000000000108';

const jefe = { id: 5, empleadoId: 7, role: { name: 'Jefe de proyecto' } };
const admin = { id: 1, empleadoId: null, role: { name: 'Administrador' } };
const otroJefe = { id: 6, empleadoId: 8, role: { name: 'Jefe de proyecto' } };

function jornadaMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    claveOperacion: uuid,
    proyectoId: 10,
    empleadoId: 20,
    fecha: new Date('2026-11-10T00:00:00.000Z'),
    creadoPorId: 5,
    verificacionInicioAt: null,
    verificacionRetornoAt: null,
    proyecto: { id: 10, nombre: 'Torre', estado: 'ACTIVO', jefeProyectoId: 7 },
    empleado: { id: 20, nombreCompleto: 'Técnico Uno' },
    items: [
      {
        id: 100,
        herramienta: { id: 1, codigoUnico: 'HERR-0001', nombre: 'Taladro' },
        estadoInicio: 'PENDIENTE',
        estadoRetorno: 'PENDIENTE',
      },
      {
        id: 101,
        herramienta: { id: 2, codigoUnico: 'HERR-0002', nombre: 'Sierra' },
        estadoInicio: 'PENDIENTE',
        estadoRetorno: 'PENDIENTE',
      },
    ],
    ...overrides,
  };
}

const dtoBase = {
  claveOperacion: uuid,
  proyectoId: 10,
  empleadoId: 20,
  fecha: '2026-11-10',
};

describe('JornadaHerramientasService', () => {
  function setup() {
    const repo = {
      findUsuario: jest.fn(),
      findProyecto: jest.fn(),
      asignacionVigente: jest.fn(),
      herramientasDespachadas: jest.fn(),
      findByClave: jest.fn(),
      findByUnique: jest.fn(),
      findById: jest.fn(),
      crear: jest.fn(),
      actualizarItemInicio: jest.fn(),
      confirmarInicio: jest.fn(),
    };
    const actividades = { findProyectosDisponibles: jest.fn() };
    const service = new JornadaHerramientasService(
      repo as any,
      actividades as any,
    );
    return { repo, service, actividades };
  }

  describe('abrir', () => {
    it('crea el checklist importando las herramientas despachadas al proyecto', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findByClave.mockResolvedValue(null);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        jefeProyectoId: 7,
        estado: 'ACTIVO',
      });
      repo.asignacionVigente.mockResolvedValue({ empleadoId: 20 });
      repo.findByUnique.mockResolvedValue(null);
      repo.herramientasDespachadas.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      repo.crear.mockResolvedValue(jornadaMock());

      const resultado = await service.abrir(dtoBase, jefe.id);

      expect(repo.crear).toHaveBeenCalledWith(
        expect.objectContaining({ herramientaIds: [1, 2], creadoPorId: jefe.id }),
      );
      expect(resultado.repetido).toBe(false);
    });

    it('rechaza a un jefe que no es el asignado al proyecto', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(otroJefe);
      repo.findByClave.mockResolvedValue(null);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        jefeProyectoId: 7,
        estado: 'ACTIVO',
      });

      await expect(service.abrir(dtoBase, otroJefe.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('permite al administrador aunque no sea el jefe del proyecto', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(admin);
      repo.findByClave.mockResolvedValue(null);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        jefeProyectoId: 7,
        estado: 'ACTIVO',
      });
      repo.asignacionVigente.mockResolvedValue({ empleadoId: 20 });
      repo.findByUnique.mockResolvedValue(null);
      repo.herramientasDespachadas.mockResolvedValue([{ id: 1 }]);
      repo.crear.mockResolvedValue(jornadaMock());

      await expect(service.abrir(dtoBase, admin.id)).resolves.toBeDefined();
    });

    it('rechaza si el técnico no está asignado al proyecto', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findByClave.mockResolvedValue(null);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        jefeProyectoId: 7,
        estado: 'ACTIVO',
      });
      repo.asignacionVigente.mockResolvedValue(null);

      await expect(service.abrir(dtoBase, jefe.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza si el proyecto no tiene herramientas despachadas', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findByClave.mockResolvedValue(null);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        jefeProyectoId: 7,
        estado: 'ACTIVO',
      });
      repo.asignacionVigente.mockResolvedValue({ empleadoId: 20 });
      repo.findByUnique.mockResolvedValue(null);
      repo.herramientasDespachadas.mockResolvedValue([]);

      await expect(service.abrir(dtoBase, jefe.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('es idempotente: devuelve el existente si la clave de operación se repite', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findByClave.mockResolvedValue(jornadaMock({ creadoPorId: jefe.id }));

      const resultado = await service.abrir(dtoBase, jefe.id);

      expect(resultado.repetido).toBe(true);
      expect(repo.findProyecto).not.toHaveBeenCalled();
    });

    it('rechaza una clave de operación reutilizada por otro usuario', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findByClave.mockResolvedValue(jornadaMock({ creadoPorId: 999 }));

      await expect(service.abrir(dtoBase, jefe.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('propaga P2002 como conflicto cuando ya existe el checklist del día', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findByClave.mockResolvedValue(null);
      repo.findProyecto.mockResolvedValue({
        id: 10,
        jefeProyectoId: 7,
        estado: 'ACTIVO',
      });
      repo.asignacionVigente.mockResolvedValue({ empleadoId: 20 });
      repo.findByUnique.mockResolvedValue(null);
      repo.herramientasDespachadas.mockResolvedValue([{ id: 1 }]);
      repo.crear.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.abrir(dtoBase, jefe.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('verificarItemInicio', () => {
    it('exige observación al marcar una herramienta como ausente', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(jornadaMock());

      await expect(
        service.verificarItemInicio(1, 100, { estado: 'AUSENTE' }, jefe.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marca el item como verificado sin exigir observación', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(jornadaMock());

      await service.verificarItemInicio(
        1,
        100,
        { estado: 'VERIFICADA' },
        jefe.id,
      );

      expect(repo.actualizarItemInicio).toHaveBeenCalledWith(100, 'VERIFICADA', null);
    });

    it('rechaza verificar un item de una jornada ya confirmada', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(
        jornadaMock({ verificacionInicioAt: new Date() }),
      );

      await expect(
        service.verificarItemInicio(1, 100, { estado: 'VERIFICADA' }, jefe.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza un item que no pertenece a la jornada', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(jornadaMock());

      await expect(
        service.verificarItemInicio(1, 999, { estado: 'VERIFICADA' }, jefe.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('confirmarInicio', () => {
    it('bloquea el cierre si quedan herramientas pendientes', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(jornadaMock());

      await expect(service.confirmarInicio(1, jefe.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.confirmarInicio).not.toHaveBeenCalled();
    });

    it('confirma cuando todos los items fueron verificados o marcados ausentes', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(
        jornadaMock({
          items: [
            {
              id: 100,
              herramienta: { id: 1, codigoUnico: 'HERR-0001', nombre: 'Taladro' },
              estadoInicio: 'VERIFICADA',
            },
            {
              id: 101,
              herramienta: { id: 2, codigoUnico: 'HERR-0002', nombre: 'Sierra' },
              estadoInicio: 'AUSENTE',
            },
          ],
        }),
      );
      repo.confirmarInicio.mockResolvedValue(jornadaMock());

      await service.confirmarInicio(1, jefe.id);

      expect(repo.confirmarInicio).toHaveBeenCalledWith(1);
    });

    it('rechaza confirmar dos veces la misma jornada', async () => {
      const { repo, service } = setup();
      repo.findUsuario.mockResolvedValue(jefe);
      repo.findById.mockResolvedValue(
        jornadaMock({ verificacionInicioAt: new Date() }),
      );

      await expect(service.confirmarInicio(1, jefe.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
