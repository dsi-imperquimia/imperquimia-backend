import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Empleado } from '@gen/prisma/client';

// Repositorio para la tabla `empleados`
// Maneja todas las operaciones CRUD con la BD usando Prisma
@Injectable()
export class EmpleadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Obtiene todos los empleados
  findMany() {
    return this.prisma.models.empleado.findMany();
  }

  // Busca un empleado por id
  findUnique(id: number) {
    return this.prisma.models.empleado.findUnique({
      where: { id },
    });
  }

  // Crea un nuevo empleado
  create(
    data: Omit<Empleado, 'id' | 'createdAt' | 'updatedAt' | 'fechaRegistro'>,
  ) {
    return this.prisma.models.empleado.create({ data });
  }

  // Actualiza un empleado por id
  update(id: number, data: Partial<Empleado>) {
    return this.prisma.models.empleado.update({
      where: { id },
      data,
    });
  }

  // Elimina un empleado por id
  delete(id: number) {
    return this.prisma.models.empleado.delete({ where: { id } });
  }
}
