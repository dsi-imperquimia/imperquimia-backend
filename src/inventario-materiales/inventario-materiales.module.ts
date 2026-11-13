import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { InventarioMaterialesController } from './controllers/inventario-materiales.controller';
import { InventarioPermissionsGuard } from './guards/inventario-permissions.guard';
import { InventarioMaterialesRepository } from './repository/inventario-materiales.repository';
import { InventarioMaterialesService } from './service/inventario-materiales.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventarioMaterialesController],
  providers: [
    InventarioMaterialesRepository,
    InventarioMaterialesService,
    InventarioPermissionsGuard,
  ],
  exports: [InventarioMaterialesService],
})
export class InventarioMaterialesModule {}
