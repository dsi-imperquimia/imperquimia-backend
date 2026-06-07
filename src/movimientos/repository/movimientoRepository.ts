import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

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

  async createWithTransaction(data: {
    herramientaId: number;
    usuarioId: number;
    origen: string;
    destino: string;
    proyectoDestinoId?: number | null;
    estadoHerramienta: string;
    observaciones?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimientoHerramienta.create({
        data: {
          herramienta: { connect: { id: data.herramientaId } },
          usuario: { connect: { id: data.usuarioId } },
          origen: data.origen as any,
          destino: data.destino as any,
          proyectoDestino: data.proyectoDestinoId
            ? { connect: { id: data.proyectoDestinoId } }
            : undefined,
          estadoHerramienta: data.estadoHerramienta as any,
          observaciones: data.observaciones,
        },
      });

      await tx.herramienta.update({
        where: { id: data.herramientaId },
        data: {
          estado: data.estadoHerramienta as any,
          proyectoId: data.destino === 'PROYECTO' ? data.proyectoDestinoId : null,
        },
      });

      return movimiento;
    });
  }
}