import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { JornadaHerramientasController } from './controllers/jornada-herramientas.controller';
import { JornadaHerramientasPermissionsGuard } from './guards/jornada-herramientas-permissions.guard';
import { JornadaHerramientasRepository } from './repository/jornada-herramientas.repository';
import { JornadaHerramientasService } from './service/jornada-herramientas.service';

@Module({
  imports: [PrismaModule],
  controllers: [JornadaHerramientasController],
  providers: [
    JornadaHerramientasService,
    JornadaHerramientasRepository,
    JornadaHerramientasPermissionsGuard,
  ],
  exports: [JornadaHerramientasService, JornadaHerramientasRepository],
})
export class JornadaHerramientasModule {}
