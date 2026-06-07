import { Module } from '@nestjs/common';
import { HabilidadesService } from './habilidades.service';
import { HabilidadesController } from './habilidades.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HabilidadesController],
  providers: [HabilidadesService],  
})
export class HabilidadesModule {}
