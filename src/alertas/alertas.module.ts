import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConsumosMaterialesModule } from '@/consumos-materiales/consumos-materiales.module';
import { AlertasController } from './alertas.controller';
import { AlertasDesviacionesService } from './alertas-desviaciones.service';
import { AlertasService } from './alertas.service';
import { AlertasPermissionsGuard } from './alertas-permissions.guard';

@Module({
  imports: [PrismaModule, ConsumosMaterialesModule],
  controllers: [AlertasController],
  providers: [
    AlertasService,
    AlertasDesviacionesService,
    AlertasPermissionsGuard,
  ],
})
export class AlertasModule {}
