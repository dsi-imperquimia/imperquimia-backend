import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { HerramientaController } from './controllers/herramienta.controller';
import { HerramientaService } from './service/herramienta.service';
import { HerramientaRepository } from './repository/herramientaRepository';

@Module({
  controllers: [HerramientaController],
  providers: [PrismaService, HerramientaService, HerramientaRepository],
  exports: [HerramientaRepository],
})
export class HerramientasModule {}