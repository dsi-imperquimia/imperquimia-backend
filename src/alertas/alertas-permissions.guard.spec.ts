import { PrismaService } from '@/prisma/prisma.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AlertasController } from './alertas.controller';
import { AlertasPermissionsGuard } from './alertas-permissions.guard';

describe('permisos del módulo de alertas', () => {
  const findFirst = jest.fn();
  const guard = new AlertasPermissionsGuard(
    { user: { findFirst } } as unknown as PrismaService,
    new Reflector(),
  );

  function context(method: string, user?: { sub: number }) {
    return {
      getClass: () => AlertasController,
      getHandler: () => AlertasController.prototype[method],
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as ExecutionContext;
  }

  beforeEach(() => jest.clearAllMocks());

  it('valida el permiso de lectura de alertas en el usuario o su rol', async () => {
    findFirst.mockResolvedValue({ id: 7 });
    await expect(
      guard.canActivate(context('listarNotificaciones', { sub: 7 })),
    ).resolves.toBe(true);
    expect(
      findFirst.mock.calls[0][0].where.OR[0].permissions.some.permission.name,
    ).toBe('ALERTA_READ');
  });

  it('rechaza usuarios sin permiso o sin identidad autenticada', async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      guard.canActivate(context('crear', { sub: 7 })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(context('crear'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
