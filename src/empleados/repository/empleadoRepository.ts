import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

// Repositorio para la tabla `empleados`
// Maneja todas las operaciones CRUD con la BD usando Prisma
@Injectable()
export class EmpleadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Obtiene todos los empleados
  findMany() {
    return this.prisma.empleado.findMany();
  }

  // Busca un empleado por id
  findUnique(id: number) {
    return this.prisma.empleado.findUnique({
      where: { id },
    });
  }

  // Crea un nuevo empleado
  create(data: {
    nombreCompleto: string;
    dui: string;
    nit: string;
    cargoId: number;
    activo?: boolean;
  }) {
    return this.prisma.empleado.create({ data });
  }

  // Actualiza un empleado por id
  update(id: number, data: Partial<Record<string, unknown>>) {
    return this.prisma.empleado.update({
      where: { id },
      data,
    });
  }

  // Elimina un empleado por id
  delete(id: number) {
    return this.prisma.empleado.delete({ where: { id } });
  }
}
