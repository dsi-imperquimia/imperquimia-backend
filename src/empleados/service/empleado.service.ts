import { Empleado, Prisma } from '@gen/prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmpleadoDto } from '../dto/createEmpleado';
import { UpdateEmpleadoDto } from '../dto/updateEmpleado';
import { EmpleadoRepository } from '../repository/empleadoRepository';

@Injectable()
export class EmpleadoService {
  constructor(private readonly repo: EmpleadoRepository) {}

  private async validarDocumentosDisponibles({
    dui,
    nit,
  }: Pick<CreateEmpleadoDto, 'dui' | 'nit'>) {
    const conflicts = await this.repo.findDocumentConflicts(dui, nit);
    const message: Record<string, string[]> = {};
    if (conflicts.some((empleado) => empleado.dui === dui)) {
      message.dui = ['El DUI ya está registrado.'];
    }
    if (conflicts.some((empleado) => empleado.nit === nit)) {
      message.nit = ['El NIT ya está registrado.'];
    }
    if (Object.keys(message).length > 0) {
      throw new ConflictException({ message });
    }
  }

  // Crea un empleado nuevo y devuelve el registro creado
  async create(dto: CreateEmpleadoDto): Promise<Empleado> {
    await this.validarDocumentosDisponibles(dto);

    const datosEmpleado = {
      nombreCompleto: dto.nombreCompleto,
      dui: dto.dui,
      nit: dto.nit,
      cargoId: dto.cargoId,
      activo: dto.activo ?? true,
    };

    try {
      return await this.repo.create(datosEmpleado, dto.habilidadesIds);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Si hubo otra creación simultánea, la misma validación da el error por campo.
        await this.validarDocumentosDisponibles(dto);
      }
      throw error;
    }
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
