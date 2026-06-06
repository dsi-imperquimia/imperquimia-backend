import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Cotizacion, Prisma } from '@gen/prisma/client';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';

type DetalleCalculado = {
  materialId: number;
  cantidad: Prisma.Decimal;
  unidad: string;
  costoUnitario: Prisma.Decimal;
  subTotal: Prisma.Decimal;
  totalIva: Prisma.Decimal;
  total: Prisma.Decimal;
};

@Injectable()
export class CotizacionService {
  constructor(private readonly prisma: PrismaService) {}
  //obtener todas las cotizaciones ACTIVAS
  async getAllCotizaciones() {
    return this.prisma.cotizacion.findMany({
      include: {
        user: {
          select: {
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  //Obtener las cotizaciones por id
  async getCotizacionById(id: number) {
    return this.prisma.cotizacion.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        detalles: {
          include: {
            material: true,
          },
        },
      },
    });
  }

  //crear cotizacion con el detallecotizacion
  async createCotizacion(
    data: CreateCotizacionDto,
    userId: number,
  ): Promise<Cotizacion> {
    const cotizacionExistente = await this.prisma.cotizacion.findFirst({
      where: {
        cliente: data.cliente,
        descripcion: data.descripcion,
      },
    });

    if (cotizacionExistente) {
      throw new BadRequestException(
        'Ya existe una cotización con el mismo cliente y descipción',
      );
    }
    const detallesCalculados: DetalleCalculado[] = [];

    for (const detalle of data.detalles) {
      const material = await this.prisma.material.findUnique({
        where: {
          id: detalle.materialId,
        },
      });

      if (!material) {
        throw new BadRequestException(
          `El material con id ${detalle.materialId} no existe`,
        );
      }

      const cantidad = new Prisma.Decimal(detalle.cantidad);
      const costoUnitario = material.costoUnitario;

      const subTotal = cantidad.mul(costoUnitario);
      const totalIva = subTotal.mul(0.13);
      const total = subTotal.add(totalIva);

      detallesCalculados.push({
        materialId: material.id,
        cantidad,
        unidad: material.unidad,
        costoUnitario,
        subTotal,
        totalIva,
        total,
      });
    }

    const subTotalCotizacion = detallesCalculados.reduce(
      (acc, item) => acc.add(item.subTotal),
      new Prisma.Decimal(0),
    );

    const totalIvaCotizacion = detallesCalculados.reduce(
      (acc, item) => acc.add(item.totalIva),
      new Prisma.Decimal(0),
    );

    const totalCotizacion = detallesCalculados.reduce(
      (acc, item) => acc.add(item.total),
      new Prisma.Decimal(0),
    );

    return this.prisma.cotizacion.create({
      data: {
        descripcion: data.descripcion,
        cliente: data.cliente,
        userId,
        subTotal: subTotalCotizacion,
        totalIva: totalIvaCotizacion,
        total: totalCotizacion,
        detalles: {
          create: detallesCalculados,
        },
      },
    });
  }

  // actualizar cotizacion, con transaction se puede borrar el detalle de una cotizacion y agregar otra
  async updateCotizacion(
    id: number,
    data: UpdateCotizacionDto,
  ): Promise<Cotizacion> {
    const cotizacionExistente = await this.prisma.cotizacion.findFirst({
      where: {
        cliente: data.cliente,
        descripcion: data.descripcion,
        NOT: {
          id,
        },
      },
    });

    if (cotizacionExistente) {
      throw new BadRequestException(
        'Ya existe una cotización con el mismo cliente y descipción',
      );
    }

    const detallesCalculados: DetalleCalculado[] = [];

    for (const detalle of data.detalles) {
      const material = await this.prisma.material.findUnique({
        where: {
          id: detalle.materialId,
        },
      });

      if (!material) {
        throw new BadRequestException(
          `El material con id ${detalle.materialId} no existe`,
        );
      }

      const cantidad = new Prisma.Decimal(detalle.cantidad);
      const costoUnitario = material.costoUnitario;

      const subTotal = cantidad.mul(costoUnitario);
      const totalIva = subTotal.mul(0.13);
      const total = subTotal.add(totalIva);

      detallesCalculados.push({
        materialId: material.id,
        cantidad,
        unidad: material.unidad,
        costoUnitario,
        subTotal,
        totalIva,
        total,
      });
    }

    const subTotalCotizacion = detallesCalculados.reduce(
      (acc, item) => acc.add(item.subTotal),
      new Prisma.Decimal(0),
    );

    const totalIvaCotizacion = detallesCalculados.reduce(
      (acc, item) => acc.add(item.totalIva),
      new Prisma.Decimal(0),
    );

    const totalCotizacion = detallesCalculados.reduce(
      (acc, item) => acc.add(item.total),
      new Prisma.Decimal(0),
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.detalleCotizacion.deleteMany({
        where: {
          cotizacionId: id,
        },
      });

      return tx.cotizacion.update({
        where: { id },
        data: {
          descripcion: data.descripcion,
          cliente: data.cliente,
          estado: data.estado,
          subTotal: subTotalCotizacion,
          totalIva: totalIvaCotizacion,
          total: totalCotizacion,
          detalles: {
            create: detallesCalculados,
          },
        },
      });
    });
  }
}
