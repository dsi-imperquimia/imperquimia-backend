import { ConsumosMaterialesService } from '@/consumos-materiales/service/consumos-materiales.service';
import { MailModule } from '@/common/mail/mail.module';
import { MailService } from '@/common/mail/mail.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';
import { Test } from '@nestjs/testing';
import { AlertasModule } from './alertas.module';
import { AlertasDesviacionesService } from './alertas-desviaciones.service';

const proyecto = () => ({
  id: 4,
  nombre: 'Obra',
  jefeProyecto: {
    activo: true,
    deletedAt: null,
    user: { id: 8, deletedAt: null },
  },
  empleados: [
    {
      empleado: {
        user: { id: 9, deletedAt: null, role: { name: 'Técnico' } },
      },
    },
    {
      empleado: {
        user: { id: 10, deletedAt: null, role: { name: 'Jefe de proyecto' } },
      },
    },
  ],
});

const desviacion = () => ({
  id: 5,
  createdAt: new Date('2026-11-15T10:00:00.000Z'),
  material: { nombre: 'Pintura', unidad: 'galones' },
  valorObservado: new Prisma.Decimal(6),
  valorReferencia: new Prisma.Decimal(4),
});

describe('alertas automáticas por desviación de consumo', () => {
  const projectFindMany = jest.fn();
  const userFindMany = jest.fn();
  const notificationFindFirst = jest.fn();
  const notificationCreate = jest.fn();
  const sync = jest.fn();
  const service = new AlertasDesviacionesService(
    {
      proyecto: { findMany: projectFindMany },
      user: { findMany: userFindMany },
      notificacionAlerta: {
        findFirst: notificationFindFirst,
        create: notificationCreate,
      },
    } as unknown as PrismaService,
    {
      sincronizarDesviacionesProyecto: sync,
    } as unknown as ConsumosMaterialesService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    projectFindMany.mockResolvedValue([proyecto()]);
    userFindMany.mockResolvedValue([{ id: 7 }, { id: 8 }]);
    sync.mockResolvedValue([desviacion()]);
    notificationFindFirst.mockResolvedValue(null);
    notificationCreate.mockResolvedValue({ id: 1 });
  });

  it('notifica una vez al jefe asignado, al técnico asignado y a cada administrador', async () => {
    await service.generarAutomaticamente(new Date('2026-11-15T12:00:00.000Z'));

    expect(sync).toHaveBeenCalledWith(4);
    expect(notificationCreate).toHaveBeenCalledTimes(3);
    const destinatarios = notificationCreate.mock.calls.map(
      ([input]) => input.data.destinatarioId as number,
    );
    expect(destinatarios).toEqual([7, 8, 9]);
    for (const [input] of notificationCreate.mock.calls) {
      expect(input.data).toMatchObject({
        reglaId: -7,
        proyectoId: 4,
        nombreConfiguracion: 'Desviación de consumo',
        ultimaFechaProgramada: new Date('2026-11-15T00:00:00.000Z'),
      });
    }
  });

  it('no repite alertas existentes y entrega a un técnico asignado posteriormente', async () => {
    notificationFindFirst.mockImplementation(({ where }) =>
      Promise.resolve(where.destinatarioId === 9 ? null : { id: 1 }),
    );

    await service.generarAutomaticamente();

    expect(notificationCreate).toHaveBeenCalledTimes(1);
    expect(notificationCreate.mock.calls[0][0].data.destinatarioId).toBe(9);
  });

  it('conserva la desviación sin crear notificaciones cuando aún no hay destinatarios', async () => {
    projectFindMany.mockResolvedValue([
      { ...proyecto(), jefeProyecto: null, empleados: [] },
    ]);
    userFindMany.mockResolvedValue([]);

    await service.generarAutomaticamente();

    expect(sync).toHaveBeenCalledWith(4);
    expect(notificationCreate).not.toHaveBeenCalled();
  });
});

it('resuelve el servicio de consumos desde el módulo de alertas', async () => {
  const modulo = await Test.createTestingModule({
    imports: [MailModule, AlertasModule],
  })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(MailService)
    .useValue({})
    .compile();

  expect(modulo.get(AlertasDesviacionesService)).toBeDefined();
  await modulo.close();
});
