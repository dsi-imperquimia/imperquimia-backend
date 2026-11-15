import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ActualizarActividadDiariaDto } from '../dto/actualizar-actividad-diaria.dto';
import { CrearActividadDiariaDto } from '../dto/crear-actividad-diaria.dto';
import {
  ActividadesPermissions,
  ActividadesPermissionsGuard,
} from '../guards/actividades-permissions.guard';
import { ActividadesDiariasService } from '../service/actividades-diarias.service';
import {
  ActividadesExportService,
  FormatoExportacionActividad,
} from '../service/actividades-export.service';

@Controller('actividades-diarias')
@UseGuards(ActividadesPermissionsGuard)
export class ActividadesDiariasController {
  constructor(
    private readonly service: ActividadesDiariasService,
    private readonly exportService: ActividadesExportService,
  ) {}

  @Get('proyectos-disponibles')
  @ActividadesPermissions(
    'ACTIVIDAD_READ',
    'ACTIVIDAD_CREATE',
    'ACTIVIDAD_UPDATE',
  )
  findProyectosDisponibles(@CurrentUser() user: JwtPayload) {
    return this.service.findProyectosDisponibles(user.sub);
  }

  @Get('exportar')
  @ActividadesPermissions(
    'ACTIVIDAD_READ',
    'ACTIVIDAD_CREATE',
    'ACTIVIDAD_UPDATE',
  )
  async exportar(
    @Query('formato') formatoRaw: string | undefined,
    @Query('proyectoId', new ParseIntPipe({ optional: true }))
    proyectoId: number | undefined,
    @Query('fechaInicio') fechaInicio: string | undefined,
    @Query('fechaFin') fechaFin: string | undefined,
    @CurrentUser() user: JwtPayload,
  ): Promise<StreamableFile> {
    const formatoNormalizado = formatoRaw?.trim().toLowerCase();
    if (formatoNormalizado !== 'pdf' && formatoNormalizado !== 'excel') {
      throw new BadRequestException(
        'Formato de exportación inválido. Usa "pdf" o "excel".',
      );
    }
    const formato: FormatoExportacionActividad = formatoNormalizado;
    const { actividades, filtros } = await this.service.findParaExportar(
      user.sub,
      proyectoId,
      fechaInicio,
      fechaFin,
    );
    const archivo = await this.exportService.exportar(
      formato,
      actividades,
      filtros,
    );
    return new StreamableFile(archivo.buffer, {
      type: archivo.mimeType,
      disposition: `attachment; filename="${archivo.filename}"`,
    });
  }

  @Get(':id')
  @ActividadesPermissions(
    'ACTIVIDAD_READ',
    'ACTIVIDAD_CREATE',
    'ACTIVIDAD_UPDATE',
  )
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user.sub);
  }

  @Get()
  @ActividadesPermissions(
    'ACTIVIDAD_READ',
    'ACTIVIDAD_CREATE',
    'ACTIVIDAD_UPDATE',
  )
  findActividades(
    @Query('proyectoId', new ParseIntPipe({ optional: true }))
    proyectoId: number | undefined,
    @Query('fechaInicio') fechaInicio: string | undefined,
    @Query('fechaFin') fechaFin: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findActividades(
      user.sub,
      proyectoId,
      fechaInicio,
      fechaFin,
    );
  }

  @Post()
  @ActividadesPermissions('ACTIVIDAD_CREATE')
  registrar(
    @Body() dto: CrearActividadDiariaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.registrar(dto, user.sub);
  }

  @Patch(':id')
  @ActividadesPermissions('ACTIVIDAD_UPDATE', 'ACTIVIDAD_CREATE')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarActividadDiariaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.actualizar(id, dto, user.sub);
  }
}
