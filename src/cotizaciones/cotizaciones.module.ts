import { Module } from '@nestjs/common';
import { CotizacionController } from './cotizaciones.contoller';
import { CotizacionService } from './cotizaciones.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  controllers: [CotizacionController],
  providers: [CotizacionService],
  imports: [PrismaModule],
})
export class CotizacionModule {}
