import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProyectoRepository } from '../repository/proyectoRepository';
import { CreateProyectoDto } from '../dto/create-proyecto.dto';

@Injectable()
export class ProyectoService {
  constructor(private readonly repo: ProyectoRepository) {}

  create(dto: CreateProyectoDto) {
    return this.repo.create({
      nombre: dto.nombre,
      ubicacion: dto.ubicacion,
    });
  }

  findAll() {
    return this.repo.findMany();
  }

  async findOne(id: number) {
    const proyecto = await this.repo.findUnique(id);
    if (!proyecto) {
      throw new NotFoundException(`Proyecto #${id} no encontrado`);
    }
    return proyecto;
  }

  async remove(id: number) {
    const proyecto = await this.findOne(id);

    if (proyecto.herramientas.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar el proyecto #${id} porque tiene ${proyecto.herramientas.length} herramienta(s) asignada(s)`,
      );
    }

    return this.repo.softDelete(id);
  }
}