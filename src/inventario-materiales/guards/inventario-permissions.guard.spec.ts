import { PrismaService } from '@/prisma/prisma.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InventarioMaterialesController } from '../controllers/inventario-materiales.controller';
import { InventarioPermissionsGuard } from './inventario-permissions.guard';

describe('Permisos del inventario de materiales', () => {
  const findFirst = jest.fn();
  const guard = new InventarioPermissionsGuard(
    { user: { findFirst } } as unknown as PrismaService,
    new Reflector(),
  );

  function context(method: string, user?: { sub: number }) {
    return {
      getClass: () => InventarioMaterialesController,
      getHandler: () => InventarioMaterialesController.prototype[method],
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as ExecutionContext;
  }

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['findExistencias', 'INVENTARIO_MATERIAL_READ'],
    ['findMovimientos', 'INVENTARIO_MATERIAL_READ'],
    ['registrarEntrada', 'INVENTARIO_MATERIAL_ENTRY'],
    ['registrarSalida', 'INVENTARIO_MATERIAL_EXIT'],
  ])('exige el permiso correcto para %s', async (method, permission) => {
    findFirst.mockResolvedValue({ id: 7 });

    await expect(guard.canActivate(context(method, { sub: 7 }))).resolves.toBe(
      true,
    );

    const query = findFirst.mock.calls[0][0];
    expect(query.where).toEqual(
      expect.objectContaining({
        id: 7,
        deletedAt: null,
        OR: expect.arrayContaining([
          expect.objectContaining({ permissions: expect.anything() }),
          expect.objectContaining({ role: expect.anything() }),
        ]),
      }),
    );
    expect(query.where.OR[0].permissions.some.permission.name.in).toEqual([
      permission,
    ]);
  });

  it('rechaza usuarios sin permiso o sin identidad', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(context('registrarEntrada', { sub: 7 })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(context('registrarEntrada')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
