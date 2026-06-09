import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // 👈 Ruta relativa ajustada a tu árbol

@Injectable()
export class HabilidadesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      const habilidades = await this.prisma.habilidad.findMany({
        orderBy: { nombre: 'asc' },
      });
      return habilidades || []; // Garantiza retornar un array plano aunque esté vacío
    } catch (error) {
      throw new InternalServerErrorException('Error al recuperar el catálogo de habilidades profesionales.');
    }
  }

  async create(payload: { nombre: string; descripcion?: string }) {
    try {
      return await this.prisma.habilidad.create({
        data: payload,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya existe una habilidad registrada con este nombre.');
      }
      throw new InternalServerErrorException('No se pudo guardar la habilidad en el catálogo.');
    }
  }

  async update(id: number, payload: { nombre: string; descripcion?: string }) {
    try {
      return await this.prisma.habilidad.update({
        where: { id },
        data: payload,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('El nombre ingresado ya está en uso por otra habilidad.');
      }
      throw new InternalServerErrorException('Error al actualizar la habilidad en la base de datos.');
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.habilidad.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException('No se puede eliminar la habilidad porque está asignada a empleados.');
    }
  }
}