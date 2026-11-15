import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AreaMovimiento, EstadoHerramienta } from '@gen/prisma/client';

@Injectable()
export class MovimientoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(herramientaId?: number) {
    return this.prisma.movimientoHerramienta.findMany({
      where: herramientaId ? { herramientaId } : undefined,
      orderBy: { fechaMovimiento: 'desc' },
      include: {
        herramienta: { select: { id: true, codigoUnico: true, nombre: true } },
        usuario: { select: { id: true, name: true, lastName: true } },
        proyectoDestino: { select: { id: true, nombre: true } },
      },
    });
  }

  findUnique(id: number) {
    return this.prisma.movimientoHerramienta.findUnique({
      where: { id },
      include: {
        herramienta: true,
        usuario: { select: { id: true, name: true, lastName: true } },
        proyectoDestino: true,
      },
    });
  }

  findProyectoAsignable(id: number) {
    return this.prisma.proyecto.findFirst({
      where: { id, deletedAt: null, estado: 'ACTIVO' },
      select: { id: true },
    });
  }

  async createWithTransaction(data: {
    herramientaId: number;
    usuarioId: number;
    origen: AreaMovimiento;
    destino: AreaMovimiento;
    proyectoDestinoId?: number | null;
    estadoActual: EstadoHerramienta;
    estadoHerramienta: EstadoHerramienta;
    observaciones?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.herramienta.updateMany({
        where: {
          id: data.herramientaId,
          ubicacionActual: data.origen,
          estado: data.estadoActual,
        },
        data: {
          estado: data.estadoHerramienta,
          ubicacionActual: data.destino,
          proyectoId:
            data.destino === AreaMovimiento.PROYECTO
              ? data.proyectoDestinoId
              : null,
        },
      });
      if (actualizada.count !== 1) {
        throw new Error('UBICACION_CAMBIO');
      }

      const movimiento = await tx.movimientoHerramienta.create({
        data: {
          herramienta: { connect: { id: data.herramientaId } },
          usuario: { connect: { id: data.usuarioId } },
          origen: data.origen,
          destino: data.destino,
          proyectoDestino: data.proyectoDestinoId
            ? { connect: { id: data.proyectoDestinoId } }
            : undefined,
          estadoHerramienta: data.estadoHerramienta,
          observaciones: data.observaciones,
        },
      });

      return movimiento;
    });
  }
}
