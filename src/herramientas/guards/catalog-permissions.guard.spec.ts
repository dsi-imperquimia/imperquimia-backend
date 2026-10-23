import { PrismaService } from '@/prisma/prisma.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TiposHerramientaController } from '../controllers/tipos-herramienta.controller';
import { MarcasHerramientaController } from '../controllers/marcas-herramienta.controller';
import { CatalogPermissionsGuard } from './catalog-permissions.guard';

describe('Permisos de los catálogos de herramientas', () => {
  const findFirst = jest.fn();
  const guard = new CatalogPermissionsGuard(
    { user: { findFirst } } as unknown as PrismaService,
    new Reflector(),
  );

  function context(
    controller:
      typeof TiposHerramientaController | typeof MarcasHerramientaController,
    method: string,
    user?: { sub: number },
  ) {
    return {
      getClass: () => controller,
      getHandler: () => controller.prototype[method],
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as ExecutionContext;
  }

  beforeEach(() => jest.clearAllMocks());

  it('permite consultar ambos catálogos con permiso de lectura, creación o edición', async () => {
    findFirst.mockResolvedValue({ id: 7 });

    for (const controller of [
      TiposHerramientaController,
      MarcasHerramientaController,
    ]) {
      await expect(
        guard.canActivate(context(controller, 'list', { sub: 7 })),
      ).resolves.toBe(true);
    }

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 7,
          deletedAt: null,
          OR: expect.arrayContaining([
            expect.objectContaining({ permissions: expect.anything() }),
            expect.objectContaining({ role: expect.anything() }),
          ]),
        }),
      }),
    );
  });

  it('exige CREATE para crear y UPDATE para modificar o cambiar el estado', async () => {
    findFirst.mockResolvedValue({ id: 7 });

    await guard.canActivate(
      context(TiposHerramientaController, 'create', { sub: 7 }),
    );
    expect(
      findFirst.mock.calls[0][0].where.OR[0].permissions.some.permission.name
        .in,
    ).toEqual(['HERRAMIENTA_CREATE']);

    for (const method of ['update', 'deactivate', 'activate']) {
      await guard.canActivate(
        context(MarcasHerramientaController, method, { sub: 7 }),
      );
      const query = findFirst.mock.calls.at(-1)?.[0];
      expect(query.where.OR[0].permissions.some.permission.name.in).toEqual([
        'HERRAMIENTA_UPDATE',
      ]);
    }
  });

  it('rechaza usuarios sin permiso o sin identidad', async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        context(TiposHerramientaController, 'create', { sub: 7 }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      guard.canActivate(context(TiposHerramientaController, 'create')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
