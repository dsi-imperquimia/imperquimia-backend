import { Body, Controller, Delete, Get, Param, Patch, ParseIntPipe, Post } from '@nestjs/common';
import { EmpleadoService } from '../service/empleado.service';
import { CreateEmpleadoDto } from '../dto/createEmpleado';
import { UpdateEmpleadoDto } from '../dto/updateEmpleado';

//estos son los endpoint 
// Controlador REST para `empleados`. Rutas sencillas y comentarios en español.
@Controller('empleados')
export class EmpleadoController {
  constructor(private readonly empleadoService: EmpleadoService) {}

  // POST /empleados -> crear un empleado
  @Post()
  create(@Body() createEmpleadoDto: CreateEmpleadoDto) {
    return this.empleadoService.create(createEmpleadoDto);
  }

  // GET /empleados -> listar todos
  @Get()
  findAll() {
    return this.empleadoService.findAll();
  }

  // GET /empleados/:id -> obtener por id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.empleadoService.findOne(id);
  }

  // PATCH /empleados/:id -> actualizar
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmpleadoDto: UpdateEmpleadoDto,
  ) {
    return this.empleadoService.update(id, updateEmpleadoDto);
  }

  // DELETE /empleados/:id -> eliminar
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.empleadoService.remove(id);
  }

// GPRCIMPER-90: Guardar habilidades desde el perfil del empleado
  @Patch(':id/habilidades')
  async updateHabilidades(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { habilidadesIds: number[] },
  ) {
    return await this.empleadoService.updateHabilidades(id, body.habilidadesIds);
  }

}
