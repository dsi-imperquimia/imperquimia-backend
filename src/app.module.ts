import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CargoModule } from './cargo/cargo.module';
import { EmpleadosModule } from './empleados/empleados.module';
import { HabilidadesModule } from './empleados/habilidades/habilidades.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, CargoModule, EmpleadosModule, HabilidadesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
