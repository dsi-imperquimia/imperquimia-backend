import { mixinMethods } from '@/common/utils/mixin-methods';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

type PermissionDelegate = PrismaService['models']['permission'];

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface PermissionRepository extends PermissionDelegate {}

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class PermissionRepository implements PermissionDelegate {
  constructor(private readonly prisma: PrismaService) {
    mixinMethods(this, prisma.models.permission);
  }
}
