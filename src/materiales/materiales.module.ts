import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MaterialController } from './controllers/material.controller';
import { MaterialService } from './service/material.service';
import { MaterialRepository } from './repository/material.repository';

@Module({
  controllers: [MaterialController],
  providers: [PrismaService, MaterialService, MaterialRepository],
  exports: [MaterialRepository],
})
export class MaterialesModule {}
