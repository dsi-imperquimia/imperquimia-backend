import { PrismaService } from '@/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

const INVENTARIO_PERMISSIONS_KEY = 'inventarioPermissions';

export const InventarioPermissions = (...permissions: string[]) =>
  SetMetadata(INVENTARIO_PERMISSIONS_KEY, permissions);

@Injectable()
export class InventarioPermissionsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      INVENTARIO_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub?: number } }>();
    const userId = request.user?.sub;
    if (!required?.length || !Number.isInteger(userId)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar el inventario.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        OR: [
          {
            permissions: {
              some: {
                permission: { name: { in: required }, deletedAt: null },
              },
            },
          },
          {
            role: {
              is: {
                deletedAt: null,
                permissions: {
                  some: {
                    permission: { name: { in: required }, deletedAt: null },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!user) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar el inventario.',
      );
    }
    return true;
  }
}
