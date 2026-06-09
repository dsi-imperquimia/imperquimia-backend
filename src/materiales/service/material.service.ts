import { Injectable, NotFoundException } from '@nestjs/common';
import { MaterialRepository } from '../repository/material.repository';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';

@Injectable()
export class MaterialService {
  constructor(private readonly repo: MaterialRepository) {}

  async create(dto: CreateMaterialDto) {
    return this.repo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      unidad: dto.unidad,
      costoUnitario: dto.costoUnitario,
      estado: dto.estado ?? true,
    });
  }

  async findAll(nombre?: string, estado?: boolean) {
    const where: Record<string, unknown> = {};

    if (nombre !== undefined) {
      where.nombre = { contains: nombre, mode: 'insensitive' };
    }

    if (estado !== undefined) {
      where.estado = estado;
    }

    return this.repo.findMany(
      Object.keys(where).length > 0 ? where : undefined,
    );
  }

  async findOne(id: number) {
    const material = await this.repo.findUnique(id);
    if (!material) {
      throw new NotFoundException(`Material #${id} no encontrado`);
    }
    return material;
  }

  async update(id: number, dto: UpdateMaterialDto) {
    await this.findOne(id);
    return this.repo.update(id, dto);
  }
}
