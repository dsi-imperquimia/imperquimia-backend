import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HerramientaRepository } from '../repository/herramientaRepository';
import { CreateHerramientaDto } from '../dto/create-herramienta.dto';
import { UpdateHerramientaDto } from '../dto/update-herramienta.dto';
import { EstadoHerramienta, Prisma } from '@gen/prisma/client';

@Injectable()
export class HerramientaService {
  constructor(private readonly repo: HerramientaRepository) {}

  async create(dto: CreateHerramientaDto) {
    const codigoUnico = await this.generarCodigoUnico();

    return this.repo.create({
      codigoUnico,
      nombre: dto.nombre,
      marca: dto.marca,
      tipo: dto.tipo,
      estado: EstadoHerramienta.DISPONIBLE,
      proyectoId: dto.proyectoId ?? null,
    });
  }

  // Construye dinámicamente las condiciones del WHERE para Prisma
  async findAll(proyectoId?: number, estado?: EstadoHerramienta) {
    const where: Prisma.HerramientaWhereInput = {};

    if (proyectoId !== undefined) {
      where.proyectoId = proyectoId;
    }

    if (estado !== undefined) {
      where.estado = estado;
    }

    return this.repo.findMany(Object.keys(where).length > 0 ? where : undefined);
  }

  async findOne(id: number) {
    const herramienta = await this.repo.findUnique(id);
    if (!herramienta) {
      throw new NotFoundException(`Herramienta #${id} no encontrada`);
    }
    return herramienta;
  }

  async update(id: number, dto: UpdateHerramientaDto) {
    await this.findOne(id);
    return this.repo.update(id, dto);
  }

  private async generarCodigoUnico(): Promise<string> {
    const herramientas = await this.repo.findMany();

    const numeros = herramientas
      .map((h) => {
        const match = h.codigoUnico.match(/^HERR-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
    const codigo = `HERR-${String(siguiente).padStart(4, '0')}`;

    const existe = await this.repo.findByCodigoUnico(codigo);
    if (existe) {
      throw new BadRequestException(
        `El código generado ${codigo} ya existe, intenta de nuevo`,
      );
    }

    return codigo;
  }
}