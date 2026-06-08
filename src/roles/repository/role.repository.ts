import { mixinMethods } from '@/common/utils/mixin-methods';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

type RoleDelegate = PrismaService['models']['role'];
type RolePermissionDelegate = PrismaService['models']['rolePermission'];

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface RoleRepository extends RoleDelegate {}

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class RoleRepository implements RoleRepository {
  rolePermission: RolePermissionDelegate;

  constructor(private readonly prisma: PrismaService) {
    mixinMethods(this, this.prisma.models.role);
    this.rolePermission = this.prisma.models.rolePermission;
  }
}
