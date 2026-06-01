import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Repositorio para la tabla `cargos`
// Maneja todas las operaciones CRUD con la BD usando Prisma
@Injectable()
export class CargoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Obtiene todos los cargos
  findMany() {
    return this.prisma.cargo.findMany();
  }

  // Busca un cargo por id
  findUnique(id: number) {
    return this.prisma.cargo.findUnique({
      where: { id },
    });
  }

  // Crea un nuevo cargo
  create(data: { nombre: string }) {
    return this.prisma.cargo.create({ data });
  }

  // Actualiza un cargo por id
  update(id: number, data: { nombre?: string }) {
    return this.prisma.cargo.update({
      where: { id },
      data,
    });
  }

  // Elimina un cargo por id
  delete(id: number) {
    return this.prisma.cargo.delete({ where: { id } });
  }
}

