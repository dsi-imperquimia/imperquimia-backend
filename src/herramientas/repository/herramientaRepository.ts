import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';

@Injectable()
export class HerramientaRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where?: Prisma.HerramientaWhereInput) {
    return this.prisma.herramienta.findMany({
      where,
      include: { proyecto: true, tipo: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUnique(id: number) {
    return this.prisma.herramienta.findUnique({
      where: { id },
      include: {
        proyecto: true,
        tipo: true,
        movimientos: {
          orderBy: { fechaMovimiento: 'desc' },
          take: 10,
          include: {
            usuario: { select: { id: true, name: true, lastName: true } },
            proyectoDestino: { select: { id: true, nombre: true } },
          },
        },
      },
    });
  }

  findByCodigoUnico(codigoUnico: string) {
    return this.prisma.herramienta.findUnique({ where: { codigoUnico } });
  }

  findProyectoAsignable(id: number) {
    return this.prisma.proyecto.findFirst({
      where: { id, deletedAt: null, estado: { not: 'CANCELADO' } },
      select: { id: true },
    });
  }

  create(data: Prisma.HerramientaUncheckedCreateInput) {
    return this.prisma.herramienta.create({ data, include: { tipo: true } });
  }

  update(id: number, data: Prisma.HerramientaUncheckedUpdateInput) {
    return this.prisma.herramienta.update({
      where: { id },
      data,
      include: { tipo: true },
    });
  }
}
