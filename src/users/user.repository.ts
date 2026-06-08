import { mixinClass } from '@/common/utils/mixin-class';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type UserDelegate = PrismaService['models']['user'];

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface UserRepository extends UserDelegate {}

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class UserRepository implements UserDelegate {
  constructor(private readonly prisma: PrismaService) {
    mixinClass(this, this.prisma.models.user);
  }
}
