import { EstadoNotificacionAlerta, FrecuenciaAlerta } from '@gen/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/common/mail/mail.service';
import { AlertasService } from './alertas.service';

const mailStub = { enviar: jest.fn() } as unknown as MailService;

describe('bandeja paginada de notificaciones', () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const service = new AlertasService(
    { notificacionAlerta: { findMany, count } } as unknown as PrismaService,
    mailStub,
  );

  beforeEach(() => jest.clearAllMocks());

  it('mantiene alertas nuevas, visualizadas y atendidas en la bandeja', async () => {
    const alertas = [
      {
        id: 2,
        reglaId: 4,
        proyectoId: 8,
        estado: EstadoNotificacionAlerta.NUEVA,
        destinatarioId: 7,
      },
      {
        id: 1,
        reglaId: 4,
        proyectoId: 8,
        estado: EstadoNotificacionAlerta.VISUALIZADA,
        destinatarioId: 7,
      },
      {
        id: 3,
        reglaId: 4,
        proyectoId: 8,
        estado: EstadoNotificacionAlerta.ATENDIDA,
        destinatarioId: 7,
      },
    ];
    findMany.mockResolvedValue(alertas);
    count.mockResolvedValue(alertas.length);
    await expect(service.listarNotificaciones(7)).resolves.toMatchObject({
      items: alertas.map((item) => ({ ...item, esDestinatario: true })),
      total: 3,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  it('incluye al creador y aplica paginación a los registros visibles para él', async () => {
    findMany.mockResolvedValue([
      {
        id: 8,
        destinatarioId: 21,
        creadaPorId: 7,
        destinatario: { id: 21 },
      },
    ]);
    count.mockResolvedValue(11);
    await expect(service.listarNotificaciones(7, 2, 10)).resolves.toMatchObject(
      {
        items: [expect.objectContaining({ id: 8, esDestinatario: false })],
        total: 11,
        page: 2,
        pageSize: 10,
        totalPages: 2,
      },
    );
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { OR: [{ destinatarioId: 7 }, { creadaPorId: 7 }] },
      skip: 10,
      take: 10,
    });
  });
});

describe('creación de alertas para el equipo del proyecto', () => {
  const userFindFirst = jest.fn();
  const projectFindFirst = jest.fn();
  const createMany = jest.fn();
  const auditCreate = jest.fn();
  const transaction = jest.fn(async (callback) =>
    callback({
      notificacionAlerta: { createMany },
      auditoriaAlerta: { create: auditCreate },
    }),
  );
  const service = new AlertasService(
    {
      user: { findFirst: userFindFirst },
      proyecto: { findFirst: projectFindFirst },
      $transaction: transaction,
    } as unknown as PrismaService,
    mailStub,
  );

  beforeEach(() => jest.clearAllMocks());

  const proyectoConPersonal = () => ({
    id: 4,
    nombre: 'Impermeabilización',
    jefeProyectoId: 8,
    empleados: [
      {
        empleado: {
          id: 31,
          nombreCompleto: 'María López',
          cargo: { nombre: 'Técnica de campo' },
          user: { id: 21, deletedAt: null, role: { name: 'Jefe de proyecto' } },
        },
      },
      {
        empleado: {
          id: 32,
          nombreCompleto: 'Carlos Martínez',
          cargo: { nombre: 'Técnico de campo' },
          user: { id: 22, deletedAt: null, role: { name: 'Administrador' } },
        },
      },
      {
        empleado: {
          id: 33,
          nombreCompleto: 'Empleado sin acceso',
          cargo: { nombre: 'Técnico de campo' },
          user: null,
        },
      },
    ],
  });

  it('manda una copia independiente a todo el personal activo asignado', async () => {
    userFindFirst.mockResolvedValue({
      empleadoId: 8,
      role: { name: 'Jefe de proyecto' },
    });
    projectFindFirst.mockResolvedValue(proyectoConPersonal());

    await service.crearNotificacion(
      {
        proyectoId: 4,
        nombre: 'Falta material',
        descripcion: 'No hay stock.',
        todosAsignados: true,
      },
      12,
    );

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ destinatarioId: 21 }),
          expect.objectContaining({ destinatarioId: 22 }),
        ],
      }),
    );
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it('manda solo a los empleados seleccionados y valida que pertenezcan al proyecto', async () => {
    userFindFirst.mockResolvedValue({
      empleadoId: 8,
      role: { name: 'Jefe de proyecto' },
    });
    projectFindFirst.mockResolvedValue(proyectoConPersonal());

    await service.crearNotificacion(
      {
        proyectoId: 4,
        nombre: 'Revisar avance',
        descripcion: 'Confirmar los materiales.',
        todosAsignados: false,
        empleadoIds: [32],
      },
      12,
    );

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ destinatarioId: 22 })],
      }),
    );
  });

  it('rechaza empleados no asignados al proyecto', async () => {
    userFindFirst.mockResolvedValue({
      empleadoId: 8,
      role: { name: 'Jefe de proyecto' },
    });
    projectFindFirst.mockResolvedValue(proyectoConPersonal());

    await expect(
      service.crearNotificacion(
        {
          proyectoId: 4,
          nombre: 'Revisar avance',
          descripcion: 'Confirmar los materiales.',
          todosAsignados: false,
          empleadoIds: [99],
        },
        12,
      ),
    ).rejects.toThrow(
      'Todos los destinatarios deben ser empleados activos asignados',
    );
    expect(createMany).not.toHaveBeenCalled();
  });

  it('explica si hay empleados asignados pero sin cuenta activa vinculada', async () => {
    userFindFirst.mockResolvedValue({
      empleadoId: 8,
      role: { name: 'Jefe de proyecto' },
    });
    projectFindFirst.mockResolvedValue({
      ...proyectoConPersonal(),
      empleados: [{ empleado: { id: 33, activo: true, user: null } }],
    });

    await expect(
      service.crearNotificacion(
        {
          proyectoId: 4,
          nombre: 'Revisar avance',
          descripcion: 'Confirmar los materiales.',
          todosAsignados: true,
        },
        12,
      ),
    ).rejects.toThrow('no tienen una cuenta de usuario activa vinculada');
    expect(createMany).not.toHaveBeenCalled();
  });
});

describe('personal disponible para recibir alertas', () => {
  it('incluye al personal asignado y señala quién tiene una cuenta activa', async () => {
    const userFindFirst = jest.fn().mockResolvedValue({
      empleadoId: 8,
      role: { name: 'Administrador' },
    });
    const projectFindMany = jest.fn().mockResolvedValue([
      {
        id: 4,
        nombre: 'Impermeabilización',
        fechaFin: null,
        empleados: [
          {
            empleado: {
              id: 31,
              nombreCompleto: 'María López',
              cargo: { nombre: 'Técnica de campo' },
              user: null,
            },
          },
        ],
      },
    ]);
    const service = new AlertasService(
      {
        user: { findFirst: userFindFirst },
        proyecto: { findMany: projectFindMany },
      } as unknown as PrismaService,
      mailStub,
    );

    await expect(service.proyectosDisponibles(12)).resolves.toEqual([
      {
        id: 4,
        nombre: 'Impermeabilización',
        fechaFin: null,
        empleados: [
          {
            id: 31,
            nombreCompleto: 'María López',
            cargo: 'Técnica de campo',
            tieneUsuarioActivo: false,
          },
        ],
      },
    ]);
  });
});

describe('destinatarios de alertas automáticas', () => {
  it('incluye al jefe del proyecto y evita duplicarlo si también está asignado', async () => {
    const alertaCreate = jest.fn().mockResolvedValue({ id: 1 });
    const alertaFindFirst = jest.fn().mockResolvedValue(null);
    const configuracionesFindMany = jest.fn().mockResolvedValue([
      {
        id: 5,
        nombre: 'Vencimiento próximo',
        descripcion: 'Revisar avance.',
        proyectoId: 4,
        diasAntes: 7,
        frecuencia: FrecuenciaAlerta.DIARIA,
        cadaNDias: null,
        diasEspecificos: [],
        creadoPorId: 1,
        proyecto: {
          id: 4,
          nombre: 'Obra Imperquimia',
          fechaFin: new Date('2026-11-19T00:00:00.000Z'),
          empleados: [
            {
              empleado: {
                id: 10,
                activo: true,
                user: { id: 20, deletedAt: null },
              },
            },
            {
              empleado: {
                id: 11,
                activo: true,
                user: { id: 21, deletedAt: null },
              },
            },
          ],
          jefeProyecto: {
            id: 11,
            activo: true,
            deletedAt: null,
            user: { id: 21, deletedAt: null },
          },
        },
      },
    ]);
    const service = new AlertasService(
      {
        configuracionAlerta: { findMany: configuracionesFindMany },
        notificacionAlerta: {
          findFirst: alertaFindFirst,
          create: alertaCreate,
        },
        // Sin proyectos activos adicionales: la regla implícita de
        // vencimiento (GPRCIMPER-26) no debe generar notificaciones de más
        // en este escenario, que solo prueba las reglas configuradas.
        proyecto: { findMany: jest.fn().mockResolvedValue([]) },
      } as unknown as PrismaService,
      mailStub,
    );

    await service.generarAutomaticamente(new Date('2026-11-12T12:00:00.000Z'));

    expect(alertaCreate).toHaveBeenCalledTimes(2);
    expect(
      alertaCreate.mock.calls.map(([args]) => args.data.destinatarioId),
    ).toEqual(expect.arrayContaining([20, 21]));
  });
});
