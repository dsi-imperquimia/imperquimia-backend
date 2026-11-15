import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ActividadesDiariasController } from './controllers/actividades-diarias.controller';
import { ActividadesPermissionsGuard } from './guards/actividades-permissions.guard';
import { ActividadesDiariasRepository } from './repository/actividades-diarias.repository';
import { ActividadesDiariasService } from './service/actividades-diarias.service';
import { ActividadesExportService } from './service/actividades-export.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActividadesDiariasController],
  providers: [
    ActividadesDiariasRepository,
    ActividadesDiariasService,
    ActividadesExportService,
    ActividadesPermissionsGuard,
  ],
  exports: [ActividadesDiariasService],
})
export class ActividadesDiariasModule {}
