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
          include: {
            empleado: {
              select: {
                id: true,
                nombreCompleto: true,
                activo: true,
                cargo: { select: { nombre: true } },
                habilidades: { include: { habilidad: true } },
              },
            },
          },
          orderBy: { fechaAsignacion: 'desc' },
        },
        jefeProyecto: {
          select: { id: true, nombreCompleto: true, activo: true, cargo: { select: { nombre: true } } },
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

  asignarJefe(proyectoId: number, empleadoId: number) {
    return this.prisma.proyecto.update({
      where: { id: proyectoId, deletedAt: null },
      data: { jefeProyectoId: empleadoId },
    });
  }

  retirarJefe(proyectoId: number) {
    return this.prisma.proyecto.update({
      where: { id: proyectoId, deletedAt: null },
      data: { jefeProyectoId: null },
    });
  }

  cancelar(id: number) {
    return this.prisma.proyecto.update({
      where: { id, deletedAt: null },
      data: { estado: 'CANCELADO' },
    });
  }

  // Candidatos a alerta de vencimiento: proyectos activos con fecha de fin,
  // a los que todavía les falta al menos una de las dos alertas (GPRCIMPER-26).
  findCandidatosAlertaVencimiento() {
    return this.prisma.proyecto.findMany({
      where: {
        deletedAt: null,
        estado: 'ACTIVO',
        fechaFin: { not: null },
        OR: [{ alertaProximaEnviada: false }, { alertaVencidaEnviada: false }],
      },
      select: {
        id: true,
        nombre: true,
        fechaFin: true,
        alertaProximaEnviada: true,
        alertaVencidaEnviada: true,
      },
    });
  }

  marcarAlertaProximaEnviada(id: number) {
    return this.prisma.proyecto.update({
      where: { id },
      data: { alertaProximaEnviada: true },
    });
  }

  marcarAlertaVencidaEnviada(id: number) {
    return this.prisma.proyecto.update({
      where: { id },
      data: { alertaVencidaEnviada: true },
    });
  }

  findCorreosAdministradores() {
    return this.prisma.user.findMany({
      where: { deletedAt: null, role: { name: 'Administrador' } },
      select: { email: true },
    });
  }
}
