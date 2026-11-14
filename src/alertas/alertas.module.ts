import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';
import { AlertasPermissionsGuard } from './alertas-permissions.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AlertasController],
  providers: [AlertasService, AlertasPermissionsGuard],
})
export class AlertasModule {}
