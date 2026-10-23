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
      include: {
        herramientas: {
          select: { id: true, nombre: true, codigoUnico: true, estado: true },
        },
        detalles: { include: { material: true }, orderBy: { id: 'asc' } },
        empleados: {
          include: { empleado: { select: { id: true, nombreCompleto: true, activo: true, cargo: { select: { nombre: true } } } } },
          orderBy: { fechaAsignacion: 'desc' },
        },
        creadoPor: { select: { id: true, name: true, lastName: true } },
      },
    });
  }

  findMaterials(ids: number[]) {
    return this.prisma.material.findMany({ where: { id: { in: ids } } });
  }

  create(data: Prisma.ProyectoUncheckedCreateInput) {
    return this.prisma.proyecto.create({ data });
  }

  update(id: number, data: Prisma.ProyectoUpdateInput) {
    return this.prisma.proyecto.update({ where: { id, deletedAt: null }, data });
  }

  empleadoDisponible(empleadoId: number) {
    return this.prisma.empleado.findFirst({ where: { id: empleadoId, activo: true, deletedAt: null } });
  }

  asignacionActiva(empleadoId: number) {
    return this.prisma.proyectoEmpleado.findFirst({ where: { empleadoId, fechaRetiro: null } });
  }

  asignarEmpleado(proyectoId: number, empleadoId: number) {
    return this.prisma.proyectoEmpleado.upsert({
      where: { proyectoId_empleadoId: { proyectoId, empleadoId } },
      create: { proyectoId, empleadoId },
      update: { fechaAsignacion: new Date(), fechaRetiro: null },
    });
  }

  retirarEmpleado(proyectoId: number, empleadoId: number) {
    return this.prisma.proyectoEmpleado.updateMany({
      where: { proyectoId, empleadoId, fechaRetiro: null },
      data: { fechaRetiro: new Date() },
    });
  }

  cancelar(id: number) {
    return this.prisma.proyecto.update({
      where: { id, deletedAt: null },
      data: { estado: 'CANCELADO' },
    });
  }
}
