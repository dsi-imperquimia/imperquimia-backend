import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CargoModule } from './cargo/cargo.module';
import { CotizacionModule } from './cotizaciones/cotizaciones.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { HerramientasModule } from './herramientas/herramientas.module';
import { MaterialesModule } from './materiales/materiales.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { InventarioMaterialesModule } from './inventario-materiales/inventario-materiales.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    CargoModule,
    EmpleadosModule,
    CotizacionModule,
    PermissionsModule,
    RolesModule,
    HerramientasModule,
    MaterialesModule,
    MovimientosModule,
    ProyectosModule,
    InventarioMaterialesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
