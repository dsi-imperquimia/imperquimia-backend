import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProyectoController } from './controllers/proyecto.controller';
import { ProyectoRepository } from './repository/proyectoRepository';
import { ProyectoService } from './service/proyecto.service';
import { ProyectoAlertasService } from './service/proyecto-alertas.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProyectoController],
  providers: [ProyectoRepository, ProyectoService, ProyectoAlertasService],
  exports: [ProyectoRepository, ProyectoService, ProyectoAlertasService],
})
export class ProyectosModule {}