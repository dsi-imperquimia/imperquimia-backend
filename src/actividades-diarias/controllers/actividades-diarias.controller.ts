import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CrearActividadDiariaDto } from '../dto/crear-actividad-diaria.dto';
import {
  ActividadesPermissions,
  ActividadesPermissionsGuard,
} from '../guards/actividades-permissions.guard';
import { ActividadesDiariasService } from '../service/actividades-diarias.service';

@Controller('actividades-diarias')
@UseGuards(ActividadesPermissionsGuard)
export class ActividadesDiariasController {
  constructor(private readonly service: ActividadesDiariasService) {}

  @Get('proyectos-disponibles')
  @ActividadesPermissions('ACTIVIDAD_READ', 'ACTIVIDAD_CREATE')
  findProyectosDisponibles(@CurrentUser() user: JwtPayload) {
    return this.service.findProyectosDisponibles(user.sub);
  }

  @Get()
  @ActividadesPermissions('ACTIVIDAD_READ', 'ACTIVIDAD_CREATE')
  findActividades(
    @Query('proyectoId', new ParseIntPipe({ optional: true }))
    proyectoId: number | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findActividades(user.sub, proyectoId);
  }

  @Post()
  @ActividadesPermissions('ACTIVIDAD_CREATE')
  registrar(
    @Body() dto: CrearActividadDiariaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrar(dto, user.sub);
  }
}
