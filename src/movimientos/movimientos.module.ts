import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { MovimientoController } from './controllers/movimiento.controller';
import { MovimientoService } from './service/movimiento.service';
import { MovimientoRepository } from './repository/movimientoRepository';
import { HerramientasModule } from '@/herramientas/herramientas.module';

@Module({
  imports: [
    PrismaModule,
    HerramientasModule, 
  ],
  controllers: [MovimientoController],
  providers: [
    MovimientoService,
    MovimientoRepository,
  ],
  exports: [MovimientoService],
})
export class MovimientosModule {}