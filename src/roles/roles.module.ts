import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { RoleRepository } from './repository/role.repository';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService, RoleRepository],
  exports: [RoleRepository],
})
export class RolesModule {}
