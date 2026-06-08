import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';

@Injectable()
export class ProyectoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.proyecto.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUnique(id: number) {
    return this.prisma.proyecto.findFirst({
      where: { id, deletedAt: null },
      include: { herramientas: true },
    });
  }

  create(data: Prisma.ProyectoUncheckedCreateInput) {
    return this.prisma.proyecto.create({ data });
  }

  softDelete(id: number) {
    return this.prisma.proyecto.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}