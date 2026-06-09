import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MaterialRepository } from '../repository/material.repository';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';

@Injectable()
export class MaterialService {
  constructor(private readonly repo: MaterialRepository) {}

  async create(dto: CreateMaterialDto) {
    // Generar código automático si no se proporciona
    const codigo = dto.codigo || (await this.generarCodigo());

    // Verificar unicidad del código
    const existente = await this.repo.findByCodigo(codigo);
    if (existente) {
      throw new BadRequestException(`El código "${codigo}" ya está en uso`);
    }

    return this.repo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      unidad: dto.unidad,
      costoUnitario: dto.costoUnitario,
      estado: dto.estado ?? true,
      codigo,
      fichaTecnica: dto.fichaTecnica ?? null,
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

    // Si se está actualizando el código, verificar unicidad
    if (dto.codigo) {
      const existente = await this.repo.findByCodigo(dto.codigo);
      if (existente && existente.id !== id) {
        throw new BadRequestException(
          `El código "${dto.codigo}" ya está en uso por otro material`,
        );
      }
    }

    return this.repo.update(id, dto);
  }

  private async generarCodigo(): Promise<string> {
    const materiales = await this.repo.findMany();

    const numeros = materiales
      .map((m) => {
        const match = m.codigo?.match(/^MAT-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
    return `MAT-${String(siguiente).padStart(4, '0')}`;
  }
}
