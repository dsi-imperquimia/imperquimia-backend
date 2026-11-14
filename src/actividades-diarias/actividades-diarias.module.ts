import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ActividadesDiariasController } from './controllers/actividades-diarias.controller';
import { ActividadesPermissionsGuard } from './guards/actividades-permissions.guard';
import { ActividadesDiariasRepository } from './repository/actividades-diarias.repository';
import { ActividadesDiariasService } from './service/actividades-diarias.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActividadesDiariasController],
  providers: [
    ActividadesDiariasRepository,
    ActividadesDiariasService,
    ActividadesPermissionsGuard,
  ],
  exports: [ActividadesDiariasService],
})
export class ActividadesDiariasModule {}
