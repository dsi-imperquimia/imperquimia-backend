import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HerramientaRepository } from '../repository/herramientaRepository';
import { CreateHerramientaDto } from '../dto/create-herramienta.dto';
import { UpdateHerramientaDto } from '../dto/update-herramienta.dto';
import { EstadoHerramienta, Prisma } from '@gen/prisma/client';
import { TiposHerramientaService } from './tipos-herramienta.service';
import { MarcasHerramientaService } from './marcas-herramienta.service';

@Injectable()
export class HerramientaService {
  constructor(
    private readonly repo: HerramientaRepository,
    private readonly tipos: TiposHerramientaService,
    private readonly marcas: MarcasHerramientaService,
  ) {}

  async create(dto: CreateHerramientaDto) {
    await this.tipos.ensureSelectable(dto.tipoId);
    const marca = await this.marcas.ensureSelectable(dto.marcaId);
    const codigoUnico = await this.generarCodigoUnico();

    const herramienta = await this.repo.create({
      codigoUnico,
      nombre: dto.nombre,
      marca: marca.nombre,
      marcaId: marca.id,
      tipoId: dto.tipoId,
      estado: EstadoHerramienta.DISPONIBLE,
      proyectoId: dto.proyectoId ?? null,
    });
    return this.withTipoNombre(herramienta);
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

    const herramientas = await this.repo.findMany(
      Object.keys(where).length > 0 ? where : undefined,
    );
    return herramientas.map((herramienta) => this.withTipoNombre(herramienta));
  }

  async findOne(id: number) {
    const herramienta = await this.repo.findUnique(id);
    if (!herramienta) {
      throw new NotFoundException(`Herramienta #${id} no encontrada`);
    }
    return this.withTipoNombre(herramienta);
  }

  async update(id: number, dto: UpdateHerramientaDto) {
    const actual = await this.findOne(id);
    if (dto.tipoId !== undefined && dto.tipoId !== actual.tipoId) {
      await this.tipos.ensureSelectable(dto.tipoId);
    }
    const marca =
      dto.marcaId !== undefined && dto.marcaId !== actual.marcaId
        ? await this.marcas.ensureSelectable(dto.marcaId)
        : undefined;
    const herramienta = await this.repo.update(id, {
      ...dto,
      ...(marca ? { marca: marca.nombre } : {}),
    });
    return this.withTipoNombre(herramienta);
  }

  private withTipoNombre<T extends { tipo: { nombre: string } }>(
    herramienta: T,
  ) {
    const { tipo, ...datos } = herramienta;
    return { ...datos, tipo: tipo.nombre };
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
