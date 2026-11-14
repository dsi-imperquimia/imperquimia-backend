import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProyectoController } from './controllers/proyecto.controller';
import { ProyectoRepository } from './repository/proyectoRepository';
import { ProyectoService } from './service/proyecto.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProyectoController],
  providers: [ProyectoRepository, ProyectoService],
  exports: [ProyectoRepository, ProyectoService],
})
export class ProyectosModule {}