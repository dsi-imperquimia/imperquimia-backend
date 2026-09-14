import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gen/prisma/client';
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

    if (proyecto.empleados.some((asignacion) => asignacion.fechaRetiro === null)) {
      throw new ConflictException('Retira los empleados asignados antes de eliminar el proyecto.');
    }

    if (proyecto.herramientas.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar el proyecto #${id} porque tiene ${proyecto.herramientas.length} herramienta(s) asignada(s)`,
      );
    }

    return this.repo.softDelete(id);
  }

  async asignarEmpleado(proyectoId: number, empleadoId: number) {
    await this.findOne(proyectoId);
    if (!(await this.repo.empleadoDisponible(empleadoId))) {
      throw new NotFoundException('Empleado no encontrado o inactivo.');
    }
    if (await this.repo.asignacionActiva(empleadoId)) {
      throw new ConflictException('El empleado ya tiene una asignación activa. Retíralo antes de asignarlo nuevamente.');
    }
    try {
      return await this.repo.asignarEmpleado(proyectoId, empleadoId);
    } catch (error) {
      // El indice protege tambien solicitudes concurrentes que superen la comprobacion anterior.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('El empleado ya tiene una asignación activa.');
      }
      throw error;
    }
  }

  async retirarEmpleado(proyectoId: number, empleadoId: number) {
    await this.findOne(proyectoId);
    const result = await this.repo.retirarEmpleado(proyectoId, empleadoId);
    if (!result.count) throw new NotFoundException('No existe una asignación activa de este empleado en el proyecto.');
    return { message: 'Empleado retirado del proyecto.' };
  }
}
