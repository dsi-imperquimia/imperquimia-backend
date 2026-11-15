import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ActualizarActividadDiariaDto } from '../dto/actualizar-actividad-diaria.dto';
import { CrearActividadDiariaDto } from '../dto/crear-actividad-diaria.dto';
import {
  ActividadesPermissions,
  ActividadesPermissionsGuard,
} from '../guards/actividades-permissions.guard';
import { ActividadesDiariasService } from '../service/actividades-diarias.service';
import {
  ActividadesEvidenciasService,
  type ArchivoImagenSubido,
  MAX_ARCHIVOS_POR_SUBIDA,
  MAX_TAMANO_IMAGEN_BYTES,
} from '../service/actividades-evidencias.service';
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
    private readonly evidenciasService: ActividadesEvidenciasService,
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

  @Get(':id/evidencias')
  @ActividadesPermissions(
    'ACTIVIDAD_READ',
    'ACTIVIDAD_CREATE',
    'ACTIVIDAD_UPDATE',
  )
  listarEvidencias(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.evidenciasService.listar(id, user.sub);
  }

  @Post(':id/evidencias')
  @ActividadesPermissions('ACTIVIDAD_UPDATE', 'ACTIVIDAD_CREATE')
  @UseInterceptors(
    FilesInterceptor('archivos', MAX_ARCHIVOS_POR_SUBIDA + 1, {
      limits: {
        fileSize: MAX_TAMANO_IMAGEN_BYTES + 2 * 1024 * 1024,
        files: MAX_ARCHIVOS_POR_SUBIDA + 1,
      },
    }),
  )
  adjuntarEvidencias(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() archivos: ArchivoImagenSubido[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.evidenciasService.adjuntar(id, archivos, user.sub);
  }

  @Get(':id/evidencias/:evidenciaId/archivo')
  @ActividadesPermissions(
    'ACTIVIDAD_READ',
    'ACTIVIDAD_CREATE',
    'ACTIVIDAD_UPDATE',
  )
  async descargarArchivoEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @Param('evidenciaId', ParseIntPipe) evidenciaId: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<StreamableFile> {
    const archivo = await this.evidenciasService.obtenerArchivo(
      id,
      evidenciaId,
      user.sub,
    );
    return new StreamableFile(archivo.stream, {
      type: archivo.mimeType,
      disposition: archivo.disposition,
    });
  }

  @Delete(':id/evidencias/:evidenciaId')
  @ActividadesPermissions('ACTIVIDAD_UPDATE', 'ACTIVIDAD_CREATE')
  eliminarEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @Param('evidenciaId', ParseIntPipe) evidenciaId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.evidenciasService.eliminar(id, evidenciaId, user.sub);
  }
}
