import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, BadRequestException } from '@nestjs/common';
import { HabilidadesService } from './habilidades.service';
import { CreateHabilidadeDto } from './dto/create-habilidade.dto';
import { UpdateHabilidadeDto } from './dto/update-habilidade.dto';


@Controller('habilidades')
export class HabilidadesController {
  constructor(private readonly habilidadesService: HabilidadesService) {}
    

  //Crear habilidad (valida que no exista duplicado).
  @Post()
  create(@Body() createHabilidadeDto: CreateHabilidadeDto) {
    return this.habilidadesService.create(createHabilidadeDto);
  }
 
  //Listar todas las habilidades (para el dropdown del frontend).
  @Get()
  findAll() {
    return this.habilidadesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.habilidadesService.findOne(+id);
  }

  // Editar nombre o descripción de la habilidad en el catálogo.
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHabilidadeDto: UpdateHabilidadeDto) {
   // ✨ Pasamos el ID y los datos del Body.
   return this.habilidadesService.update(+id, updateHabilidadeDto);
  }

  // Eliminar habilidad (GPRCIMPER-88)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    // Convertimos el parámetro 'id' de string a número usando el operador '+'
    // delegando la lógica de validación (si está asignada a empleados activos) al servicio.
    return this.habilidadesService.remove(+id);        
  }
}
