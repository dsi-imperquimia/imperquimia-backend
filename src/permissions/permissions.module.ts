import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionRepository } from './repository/permission.repository';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionRepository, PermissionsService],
  exports: [PermissionRepository],
})
export class PermissionsModule {}
