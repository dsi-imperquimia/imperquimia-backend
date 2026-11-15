import { ActividadesDiariasModule } from '@/actividades-diarias/actividades-diarias.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { IncidenciasController } from './controllers/incidencias.controller';
import { IncidenciasPermissionsGuard } from './guards/incidencias-permissions.guard';
import { IncidenciasRepository } from './repository/incidencias.repository';
import { IncidenciasService } from './service/incidencias.service';

@Module({
  imports: [PrismaModule, ActividadesDiariasModule],
  controllers: [IncidenciasController],
  providers: [
    IncidenciasRepository,
    IncidenciasService,
    IncidenciasPermissionsGuard,
  ],
  exports: [IncidenciasService],
})
export class IncidenciasModule {}
