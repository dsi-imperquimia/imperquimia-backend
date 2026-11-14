import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';

@Injectable()
export class MaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where?: Prisma.MaterialWhereInput) {
    return this.prisma.material.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  findUnique(id: number) {
    return this.prisma.material.findUnique({
      where: { id },
    });
  }

  findByCodigo(codigo: string) {
    return this.prisma.material.findUnique({
      where: { codigo },
    });
  }

  create(data: Prisma.MaterialCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const material = await tx.material.create({ data });
      const bodega = await tx.ubicacionMaterial.findUnique({
        where: { codigo: 'BODEGA-GENERAL' },
        select: { id: true },
      });
      if (bodega) {
        await tx.existenciaMaterial.create({
          data: {
            materialId: material.id,
            ubicacionId: bodega.id,
            cantidad: 0,
          },
        });
      }
      return material;
    });
  }

  update(id: number, data: Prisma.MaterialUncheckedUpdateInput) {
    return this.prisma.material.update({ where: { id }, data });
  }
}
