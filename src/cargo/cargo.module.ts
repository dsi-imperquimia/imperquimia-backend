import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CargoController } from './controllers/cargo.controller';
import { CargoRepository } from './repository/cargoRepository';
import { CargoService } from './service/cargo.service';

@Module({
  imports: [PrismaModule],
  controllers: [CargoController],
  providers: [CargoRepository, CargoService],
  exports: [CargoRepository, CargoService],
})
export class CargoModule {}
