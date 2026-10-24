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

const CATALOG_PERMISSIONS_KEY = 'catalogPermissions';

export const CatalogPermissions = (...permissions: string[]) =>
  SetMetadata(CATALOG_PERMISSIONS_KEY, permissions);

@Injectable()
export class CatalogPermissionsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      CATALOG_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub?: number } }>();
    const userId = request.user?.sub;

    if (!required?.length || !Number.isInteger(userId)) {
      throw new ForbiddenException('No tienes permiso para este catálogo');
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
      throw new ForbiddenException('No tienes permiso para este catálogo');
    }

    return true;
  }
}
