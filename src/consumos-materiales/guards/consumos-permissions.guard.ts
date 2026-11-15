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

const CONSUMOS_PERMISSIONS_KEY = 'consumosMaterialesPermissions';

export const ConsumosPermissions = (...permissions: string[]) =>
  SetMetadata(CONSUMOS_PERMISSIONS_KEY, permissions);

@Injectable()
export class ConsumosPermissionsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      CONSUMOS_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub?: number } }>();
    const userId = request.user?.sub;
    if (!required?.length || !Number.isInteger(userId)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar consumos de materiales.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        permissions: {
          where: { permission: { deletedAt: null } },
          select: { permission: { select: { name: true } } },
        },
        role: {
          select: {
            deletedAt: true,
            permissions: {
              where: { permission: { deletedAt: null } },
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });
    const disponibles = new Set([
      ...(user?.permissions.map((item) => item.permission.name) ?? []),
      ...(user?.role?.deletedAt
        ? []
        : (user?.role?.permissions.map((item) => item.permission.name) ?? [])),
    ]);
    if (!user || !required.every((permission) => disponibles.has(permission))) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar consumos de materiales.',
      );
    }
    return true;
  }
}
