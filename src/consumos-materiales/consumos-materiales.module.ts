import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConsumosMaterialesController } from './controllers/consumos-materiales.controller';
import { ConsumosPermissionsGuard } from './guards/consumos-permissions.guard';
import { ConsumosMaterialesRepository } from './repository/consumos-materiales.repository';
import { ConsumosMaterialesService } from './service/consumos-materiales.service';
import { PdfConsumosService } from './service/pdf-consumos.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConsumosMaterialesController],
  providers: [
    ConsumosMaterialesRepository,
    ConsumosMaterialesService,
    PdfConsumosService,
    ConsumosPermissionsGuard,
  ],
  exports: [ConsumosMaterialesService],
})
export class ConsumosMaterialesModule {}
