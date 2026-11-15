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

  cancelar(id: number, motivo: string) {
    return this.prisma.proyecto.update({
      where: { id, deletedAt: null },
      data: { estado: 'CANCELADO', motivoCancelacion: motivo },
    });
  }

  // Empleados con asignación vigente al momento de cancelar, con su correo
  // de usuario (si tienen cuenta) para notificarles (GPRCIMPER-28).
  findCorreosEmpleadosActivos(proyectoId: number) {
    return this.prisma.proyectoEmpleado.findMany({
      where: { proyectoId, fechaRetiro: null },
      select: {
        empleado: {
          select: {
            nombreCompleto: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  asignacionVigente(proyectoId: number, empleadoId: number) {
    return this.prisma.proyectoEmpleado.findFirst({
      where: { proyectoId, empleadoId, fechaRetiro: null },
      select: { empleado: { select: { nombreCompleto: true } } },
    });
  }

  // Retira del origen y asigna al destino en una sola transacción (GPRCIMPER-84).
  // Si el destino ya tenía una fila de este empleado de un paso anterior
  // (reasignaciones de ida y vuelta), se limpia vistaAt: sin esto, "Mis
  // proyectos" (GPRCIMPER-122) mostraría la nueva asignación como "Vista"
  // desde el principio, arrastrando el estado de la asignación vieja.
  reasignarEmpleado(origenId: number, destinoId: number, empleadoId: number) {
    return this.prisma.$transaction([
      this.prisma.proyectoEmpleado.updateMany({
        where: { proyectoId: origenId, empleadoId, fechaRetiro: null },
        data: { fechaRetiro: new Date() },
      }),
      this.prisma.proyectoEmpleado.upsert({
        where: { proyectoId_empleadoId: { proyectoId: destinoId, empleadoId } },
        create: { proyectoId: destinoId, empleadoId },
        update: { fechaAsignacion: new Date(), fechaRetiro: null, vistaAt: null },
      }),
    ]);
  }

  // Jefe del proyecto de origen y su correo, para notificarle la reasignación (GPRCIMPER-84).
  findJefeProyecto(proyectoId: number) {
    return this.prisma.proyecto.findFirst({
      where: { id: proyectoId, deletedAt: null },
      select: {
        jefeProyecto: {
          select: { user: { select: { id: true, email: true } } },
        },
      },
    });
  }

  crearNotificacionReasignacion(data: {
    proyectoId: number;
    destinatarioId: number;
    creadaPorId: number;
    nombreProyecto: string;
    descripcion: string;
  }) {
    const ahora = new Date();
    return this.prisma.notificacionAlerta.create({
      data: {
        reglaId: null,
        configuracionId: null,
        proyectoId: data.proyectoId,
        destinatarioId: data.destinatarioId,
        creadaPorId: data.creadaPorId,
        nombreConfiguracion: 'Reasignación de técnico',
        nombreProyecto: data.nombreProyecto,
        descripcion: data.descripcion,
        primeraGeneracion: ahora,
        ultimaGeneracion: ahora,
        ultimaFechaProgramada: ahora,
      },
    });
  }
}
