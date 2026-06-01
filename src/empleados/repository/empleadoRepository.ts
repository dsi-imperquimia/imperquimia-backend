import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/*
  Repositorio para `empleados`.
  Observación: el delegado de Prisma suele ser el nombre del modelo en minúsculas
  (p.ej. `empleado`). Si en tu `schema.prisma` el modelo se llama distinto,
  adapta `this.prisma.empleado` por el nombre correcto (p.ej. `this.prisma.empleados`).
*/
@Injectable()
export class EmpleadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Obtiene todos los empleados
  findMany() {
    return this.prisma.empleado.findMany();
  }

  // Busca un empleado por PK
  findUnique(id: number) {
    return this.prisma.empleado.findUnique({
      where: { id_empleado: id },
    });
  }

  // Crea un nuevo empleado
  create(data: {
    nombre_completo: string;
    dui: string;
    nit: string;
    id_cargo: number;
    id_rol: number;
    activo?: boolean;
  }) {
    return this.prisma.empleado.create({ data });
  }

  // Actualiza un empleado por id
  update(id: number, data: Partial<Record<string, unknown>>) {
    return this.prisma.empleado.update({
      where: { id_empleado: id },
      data,
    });
  }

  // Elimina un empleado por id
  delete(id: number) {
    return this.prisma.empleado.delete({ where: { id_empleado: id } });
  }
}
