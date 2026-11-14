import { PrismaService } from '@/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ALERTAS_PERMISSION_KEY } from './alertas-permission.decorator';

@Injectable()
export class AlertasPermissionsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<string>(
      ALERTAS_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub?: number } }>();
    const userId = request.user?.sub;
    if (!permission || !Number.isInteger(userId)) {
      throw new ForbiddenException('No tienes permiso para gestionar alertas.');
    }

    const usuario = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        OR: [
          {
            permissions: {
              some: {
                permission: { name: permission, deletedAt: null },
              },
            },
          },
          {
            role: {
              is: {
                deletedAt: null,
                permissions: {
                  some: {
                    permission: { name: permission, deletedAt: null },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!usuario) {
      throw new ForbiddenException('No tienes permiso para gestionar alertas.');
    }
    return true;
  }
}
