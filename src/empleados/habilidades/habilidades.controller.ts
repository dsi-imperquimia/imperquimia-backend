import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { HabilidadesService } from './habilidades.service';
import { CreateHabilidadeDto } from './dto/create-habilidade.dto';
import { UpdateHabilidadeDto } from './dto/update-habilidade.dto';

@Controller('catalogo-habilidades') // 👈 Esto mapea exactamente la URL del Axios de tu Frontend
export class HabilidadesController {
  constructor(private readonly habilidadesService: HabilidadesService) {}

  @Get()
  async getAll() {
    return await this.habilidadesService.findAll();
  }

  @Post()
  async create(@Body() payload: CreateHabilidadeDto) {
    return await this.habilidadesService.create(payload);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateHabilidadeDto,
  ) {
    return await this.habilidadesService.update(id, payload);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.habilidadesService.remove(id);
  }
}