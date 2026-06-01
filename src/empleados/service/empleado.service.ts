import { Injectable, NotFoundException } from '@nestjs/common';
import { EmpleadoRepository } from '../repository/empleadoRepository';
import { CreateEmpleadoDto } from '../dto/createEmpleado';
import { UpdateEmpleadoDto } from '../dto/updateEmpleado';
import { EmpleadoResponse } from '../models/empleado';

@Injectable()
export class EmpleadoService {
  constructor(private readonly repo: EmpleadoRepository) {}

  // Crea un empleado nuevo y devuelve el registro creado
  async create(createEmpleadoDto: CreateEmpleadoDto): Promise<EmpleadoResponse> {
    // Aquí podrías añadir validaciones adicionales (p.ej. DUI/NIT únicos)
    return this.repo.create({
      nombreCompleto: createEmpleadoDto.nombreCompleto,
      dui: createEmpleadoDto.dui,
      nit: createEmpleadoDto.nit,
      cargoId: createEmpleadoDto.cargoId,
      activo: createEmpleadoDto.activo ?? true,
    });
  }

  // Lista todos los empleados
  async findAll(): Promise<EmpleadoResponse[]> {
    return this.repo.findMany();
  }

  // Obtiene un empleado por id; lanza NotFoundException si no existe
  async findOne(id: number): Promise<EmpleadoResponse> {
    const empleado = await this.repo.findUnique(id);
    if (!empleado) {
      throw new NotFoundException(`Empleado #${id} no encontrado`);
    }
    return empleado;
  }

  // Actualiza un empleado existente
  async update(id: number, updateEmpleadoDto: UpdateEmpleadoDto): Promise<EmpleadoResponse> {
    await this.findOne(id); // aseguramos que existe
    return this.repo.update(id, updateEmpleadoDto as Partial<Record<string, unknown>>);
  }

  // Elimina un empleado y devuelve el registro eliminado
  async remove(id: number): Promise<EmpleadoResponse> {
    const empleado = await this.findOne(id);
    await this.repo.delete(id);
    return empleado;
  }
}
