import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';
import { ConsumosMaterialesRepository } from './consumos-materiales.repository';

describe('Acceso a consumos por proyecto', () => {
  it('no autoriza por ausencia de empleado y exige asignación activa', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const repo = new ConsumosMaterialesRepository({
      user: { findFirst },
    } as unknown as PrismaService);

    await repo.usuarioPuedeOperarProyecto(7, 12, true);

    const where = findFirst.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { role: { is: { id: 1, deletedAt: null } } },
      {
        empleado: {
          is: {
            OR: [
              { proyectosComoJefe: { some: { id: 12 } } },
              {
                proyectos: {
                  some: { proyectoId: 12, fechaRetiro: null },
                },
              },
            ],
          },
        },
      },
    ]);
  });
});

describe('sincronización periódica de desviaciones', () => {
  it('no reescribe una desviación activa si su cálculo no cambió', async () => {
    const actual = {
      id: 5,
      consumoId: 10,
      regla: 'EXCESO_COTIZADO',
      valorObservado: new Prisma.Decimal(6),
      valorReferencia: new Prisma.Decimal(4),
      factorUmbral: new Prisma.Decimal(1),
      activa: true,
    };
    const findMany = jest.fn().mockResolvedValue([actual]);
    const updateMany = jest.fn();
    const upsert = jest.fn();
    const tx = { desviacionConsumo: { findMany, updateMany, upsert } };
    const repo = new ConsumosMaterialesRepository({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as unknown as PrismaService);

    await repo.sincronizarDesviaciones(4, [
      {
        consumoId: 10,
        proyectoId: 4,
        materialId: 8,
        regla: 'EXCESO_COTIZADO',
        valorObservado: new Prisma.Decimal(6),
        valorReferencia: new Prisma.Decimal(4),
        factorUmbral: new Prisma.Decimal(1),
      },
    ]);

    expect(updateMany).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });
});
