import { Injectable } from '@nestjs/common';
import { mixinMethods } from '../common/utils/mixin-methods';
import { PrismaService } from '../prisma/prisma.service';

type UserDelegate = PrismaService['models']['user'];

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface UserRepository extends UserDelegate {}

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class UserRepository implements UserDelegate {
  constructor(private readonly prisma: PrismaService) {
    mixinMethods(this, prisma.models.user);
  }
}
