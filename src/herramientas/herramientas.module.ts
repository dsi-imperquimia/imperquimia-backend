import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { HerramientaController } from './controllers/herramienta.controller';
import { HerramientaService } from './service/herramienta.service';
import { HerramientaRepository } from './repository/herramientaRepository';
import { TiposHerramientaController } from './controllers/tipos-herramienta.controller';
import { TiposHerramientaService } from './service/tipos-herramienta.service';
import { MarcasHerramientaController } from './controllers/marcas-herramienta.controller';
import { MarcasHerramientaService } from './service/marcas-herramienta.service';
import { CatalogPermissionsGuard } from './guards/catalog-permissions.guard';

@Module({
  controllers: [
    HerramientaController,
    TiposHerramientaController,
    MarcasHerramientaController,
  ],
  providers: [
    PrismaService,
    HerramientaService,
    HerramientaRepository,
    TiposHerramientaService,
    MarcasHerramientaService,
    CatalogPermissionsGuard,
  ],
  exports: [HerramientaRepository],
})
export class HerramientasModule {}
