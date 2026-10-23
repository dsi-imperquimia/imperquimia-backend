import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';

@Injectable()
export class TiposHerramientaService {
  constructor(private readonly prisma: PrismaService) {}

  list(activeOnly = false) {
    return this.prisma.tipoHerramienta.findMany({
      where: activeOnly ? { activo: true } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async ensureSelectable(id: number) {
    const tipo = await this.prisma.tipoHerramienta.findUnique({
      where: { id },
    });
    if (!tipo || !tipo.activo) {
      throw new BadRequestException('Selecciona un tipo de herramienta activo');
    }
    return tipo;
  }

  async create(nombre: string) {
    const limpio = await this.validateName(nombre);
    try {
      return await this.prisma.tipoHerramienta.create({
        data: { nombre: limpio },
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async update(id: number, nombre: string) {
    const actual = await this.findOne(id);
    const limpio = await this.validateName(nombre, id);
    if (actual.nombre === limpio) return actual;
    try {
      return await this.prisma.tipoHerramienta.update({
        where: { id },
        data: { nombre: limpio },
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async setActive(id: number, activo: boolean) {
    await this.findOne(id);
    return this.prisma.tipoHerramienta.update({
      where: { id },
      data: { activo },
    });
  }

  private async findOne(id: number) {
    const tipo = await this.prisma.tipoHerramienta.findUnique({
      where: { id },
    });
    if (!tipo)
      throw new NotFoundException(`Tipo de herramienta #${id} no encontrado`);
    return tipo;
  }

  private async validateName(nombre: string, currentId?: number) {
    const limpio = nombre.trim();
    if (!limpio)
      throw new BadRequestException('El nombre del tipo es requerido');
    if (limpio.length < 4)
      throw new BadRequestException('El tipo debe tener al menos 4 caracteres');
    const duplicado = await this.prisma.tipoHerramienta.findFirst({
      where: {
        nombre: { equals: limpio, mode: 'insensitive' },
        ...(currentId === undefined ? {} : { id: { not: currentId } }),
      },
    });
    if (duplicado)
      throw new ConflictException('Ya existe un tipo con ese nombre');
    return limpio;
  }

  private rethrowDuplicate(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ya existe un tipo con ese nombre');
    }
    throw error;
  }
}
