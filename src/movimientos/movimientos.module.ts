import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { MovimientoController } from './controllers/movimiento.controller';
import { MovimientoService } from './service/movimiento.service';
import { MovimientoRepository } from './repository/movimientoRepository';
import { HerramientasModule } from '@/herramientas/herramientas.module';
import { CatalogPermissionsGuard } from '@/herramientas/guards/catalog-permissions.guard';

@Module({
  imports: [PrismaModule, HerramientasModule],
  controllers: [MovimientoController],
  providers: [MovimientoService, MovimientoRepository, CatalogPermissionsGuard],
  exports: [MovimientoService],
})
export class MovimientosModule {}
