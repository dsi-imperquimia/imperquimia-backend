import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { HerramientaService } from '../service/herramienta.service';
import { CreateHerramientaDto } from '../dto/create-herramienta.dto';
import { UpdateHerramientaDto } from '../dto/update-herramienta.dto';
import { EstadoHerramienta } from '@gen/prisma/client';

@Controller('herramientas')
export class HerramientaController {
  constructor(private readonly herramientaService: HerramientaService) {}

  @Post()
  create(@Body() dto: CreateHerramientaDto) {
    return this.herramientaService.create(dto);
  }

// GET /herramientas
  // GET /herramientas?proyectoId=3
  // GET /herramientas?estado=DANADA
  @Get()
  findAll(
    @Query('proyectoId') proyectoId?: string,
    @Query('estado') estado?: EstadoHerramienta, //  1. Captura el ?estado de la URL
  ) {
    const id = proyectoId ? parseInt(proyectoId, 10) : undefined;
    return this.herramientaService.findAll(id, estado); //  2. Pasa como segundo argumento
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.herramientaService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHerramientaDto,
  ) {
    return this.herramientaService.update(id, dto);
  }
}