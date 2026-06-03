import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpleadoController } from './controllers/empleado.controller';
import { EmpleadoRepository } from './repository/empleadoRepository';
import { EmpleadoService } from './service/empleado.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmpleadoController],
  providers: [EmpleadoRepository, EmpleadoService],
  exports: [EmpleadoRepository, EmpleadoService],
})
export class EmpleadosModule {}
