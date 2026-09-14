import { PrismaService } from '@/prisma/prisma.service';
import { Cotizacion, Prisma } from '@gen/prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
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
        estadoCambiadoPor: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
          },
        },
        proyecto: {
          select: {
            id: true,
            nombre: true,
            estado: true,
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
    this.validarMaterialesDuplicados(data.detalles);

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
        phone: data.phone,
        email: data.email,
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
    const cotizacionActual = await this.prisma.cotizacion.findUnique({
      where: { id },
    });

    if (!cotizacionActual) {
      throw new BadRequestException('No se encontró la cotización.');
    }

    if (cotizacionActual.estado === 'APROBADA') {
      throw new BadRequestException(
        'No se puede modificar una cotización aprobada.',
      );
    }

    if (cotizacionActual.estado === 'RECHAZADA') {
      throw new BadRequestException(
        'No se puede modificar una cotización rechazada.',
      );
    }

    this.validarMaterialesDuplicados(data.detalles);
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
          phone: data.phone,
          email: data.email,
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

  private validarMaterialesDuplicados(detalles: { materialId: number }[]) {
    const materialesIds = detalles.map((detalle) => detalle.materialId);
    const materialesUnicos = new Set(materialesIds);

    if (materialesIds.length !== materialesUnicos.size) {
      throw new BadRequestException(
        'No se puede agregar el mismo material más de una vez en la cotización',
      );
    }
  }

  // Aprobar cotización y crear proyecto asociado
  async aprobarCotizacion(id: number, userId: number) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: {
        proyecto: true,
        detalles: true,
      },
    });

    if (!cotizacion) {
      throw new BadRequestException('No se encontró la cotización.');
    }

    if (cotizacion.estado === 'RECHAZADA') {
      throw new BadRequestException(
        'No se puede aprobar una cotización rechazada.',
      );
    }

    if (cotizacion.estado === 'APROBADA') {
      throw new BadRequestException('La cotización ya se encuentra aprobada.');
    }

    if (cotizacion.proyecto) {
      throw new BadRequestException(
        'La cotización ya tiene un proyecto asociado.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const cotizacionAprobada = await tx.cotizacion.update({
        where: {
          id,
        },
        data: {
          estado: 'APROBADA',
          estadoCambiadoPorId: userId,
          estadoCambiadoAt: new Date(),
        },
      });

      // crear proyecto con los datos de la cotizacion
      const proyecto = await tx.proyecto.create({
        data: {
          nombre: cotizacion.descripcion,
          descripcion: cotizacion.descripcion,

          cliente: cotizacion.cliente,
          phone: cotizacion.phone,
          email: cotizacion.email,

          subTotal: cotizacion.subTotal,
          totalIva: cotizacion.totalIva,
          total: cotizacion.total,

          estado: 'ACTIVO',

          creadoPorId: userId,

          cotizacionId: cotizacion.id,

          // mapear los materiales de la cotizacion
          detalles: {
            create: cotizacion.detalles.map((detalle) => ({
              materialId: detalle.materialId,
              cantidad: detalle.cantidad,
              unidad: detalle.unidad,
              costoUnitario: detalle.costoUnitario,
              subTotal: detalle.subTotal,
              totalIva: detalle.totalIva,
              total: detalle.total,
            })),
          },
        },

        include: {
          detalles: {
            include: {
              material: true,
            },
          },
        },
      });

      return {
        message: 'Cotización aprobada y proyecto creado correctamente.',
        cotizacion: cotizacionAprobada,
        proyecto,
      };
    });
  }

  // Rechazar cotización
  async rechazarCotizacion(id: number, userId: number) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: {
        id,
      },
    });

    if (!cotizacion) {
      throw new BadRequestException('No se encontró la cotización.');
    }

    if (cotizacion.estado === 'RECHAZADA') {
      throw new BadRequestException('La cotización ya se encuentra rechazada.');
    }

    if (cotizacion.estado === 'APROBADA') {
      throw new BadRequestException(
        'No se puede rechazar una cotización que ya fue aprobada.',
      );
    }

    return this.prisma.cotizacion.update({
      where: {
        id,
      },
      data: {
        estado: 'RECHAZADA',
        estadoCambiadoPorId: userId,
        estadoCambiadoAt: new Date(),
      },
    });
  }
}
