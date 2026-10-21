import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';

@Injectable()
export class MarcasHerramientaService {
  constructor(private readonly prisma: PrismaService) {}

  list(activeOnly = false) {
    return this.prisma.marcaHerramienta.findMany({
      where: activeOnly ? { activo: true } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async ensureSelectable(id: number) {
    const marca = await this.prisma.marcaHerramienta.findUnique({
      where: { id },
    });
    if (!marca || !marca.activo) {
      throw new BadRequestException({
        message: { marcaId: ['Selecciona una marca activa del catálogo.'] },
      });
    }
    return marca;
  }

  async create(nombre: string) {
    const limpio = this.cleanName(nombre);
    try {
      return await this.prisma.marcaHerramienta.create({
        data: { nombre: limpio, clave: limpio.toLowerCase() },
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async update(id: number, nombre: string) {
    await this.findOne(id);
    const limpio = this.cleanName(nombre);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const marca = await tx.marcaHerramienta.update({
          where: { id },
          data: { nombre: limpio, clave: limpio.toLowerCase() },
        });
        await tx.herramienta.updateMany({
          where: { marcaId: id },
          data: { marca: limpio },
        });
        return marca;
      });
    } catch (error) {
      this.rethrowDuplicate(error);
    }
  }

  async setActive(id: number, activo: boolean) {
    await this.findOne(id);
    return this.prisma.marcaHerramienta.update({
      where: { id },
      data: { activo },
    });
  }

  private async findOne(id: number) {
    const marca = await this.prisma.marcaHerramienta.findUnique({
      where: { id },
    });
    if (!marca)
      throw new NotFoundException(`Marca de herramienta #${id} no encontrada`);
    return marca;
  }

  private cleanName(nombre: string) {
    const limpio = nombre.trim();
    if (!limpio)
      throw new BadRequestException('El nombre de la marca es requerido');
    if (limpio.length < 4)
      throw new BadRequestException(
        'La marca debe tener al menos 4 caracteres',
      );
    return limpio;
  }

  private rethrowDuplicate(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        message: { nombre: ['Esta marca ya existe.'] },
      });
    }
    throw error;
  }
}
