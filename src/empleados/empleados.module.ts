import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpleadoController } from './controllers/empleado.controller';
import { EmpleadoRepository } from './repository/empleadoRepository';
import { EmpleadoService } from './service/empleado.service';
import { HabilidadesModule } from './habilidades/habilidades.module';

@Module({
  imports: [PrismaModule, HabilidadesModule],
  controllers: [EmpleadoController],
  providers: [EmpleadoRepository, EmpleadoService],
  exports: [EmpleadoRepository, EmpleadoService],
})
export class EmpleadosModule {}
