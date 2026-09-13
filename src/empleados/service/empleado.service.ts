import { Empleado } from '@gen/prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmpleadoDto } from '../dto/createEmpleado';
import { UpdateEmpleadoDto } from '../dto/updateEmpleado';
import { EmpleadoRepository } from '../repository/empleadoRepository';

@Injectable()
export class EmpleadoService {
  constructor(private readonly repo: EmpleadoRepository) {}

  // Crea un empleado nuevo y devuelve el registro creado
  async create(createEmpleadoDto: CreateEmpleadoDto): Promise<Empleado> {
    return this.repo.create(
      {
        nombreCompleto: createEmpleadoDto.nombreCompleto,
        dui: createEmpleadoDto.dui,
        nit: createEmpleadoDto.nit,
        cargoId: createEmpleadoDto.cargoId,
        activo: createEmpleadoDto.activo ?? true,
      },
      createEmpleadoDto.habilidadesIds,
    );
  }

  // Lista todos los empleados
  async findAll(): Promise<Empleado[]> {
    return this.repo.findMany();
  }

  // Obtiene un empleado por id; lanza NotFoundException si no existe
  async findOne(id: number): Promise<Empleado> {
    const empleado = await this.repo.findUnique(id);
    if (!empleado) {
      throw new NotFoundException(`Empleado #${id} no encontrado`);
    }
    return empleado;
  }

  // Actualiza un empleado existente
  async update(
    id: number,
    updateEmpleadoDto: UpdateEmpleadoDto,
  ): Promise<Empleado> {
    await this.findOne(id); // aseguramos que existe
    // Solo enviamos campos editables; cargo y habilidades del GET son relaciones.
    return this.repo.update(
      id,
      {
        nombreCompleto: updateEmpleadoDto.nombreCompleto,
        dui: updateEmpleadoDto.dui,
        nit: updateEmpleadoDto.nit,
        cargoId: updateEmpleadoDto.cargoId,
        activo: updateEmpleadoDto.activo,
      },
      updateEmpleadoDto.habilidadesIds,
    );
  }

  async updateHabilidades(id: number, habilidadesIds: number[]) {
    await this.findOne(id);
    return this.repo.update(id, {}, habilidadesIds);
  }

  // Elimina un empleado y devuelve el registro eliminado
  async remove(id: number): Promise<Empleado> {
    const empleado = await this.findOne(id);
    await this.repo.delete(id);
    return empleado;
  }
}
