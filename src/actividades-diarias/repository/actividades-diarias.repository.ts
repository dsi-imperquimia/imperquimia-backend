import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

export interface DatosCrearActividad {
  claveOperacion: string;
  proyectoId: number;
  usuarioId: number;
  empleadoId: number | null;
  fecha: Date;
  nombre: string;
  descripcion: string;
  observaciones?: string;
}

export interface DatosActualizarActividad {
  proyectoId?: number;
  fecha?: Date;
  nombre: string;
  descripcion: string;
  observaciones: string | null;
}

const includeActividad = {
  proyecto: {
    select: { id: true, nombre: true, estado: true, jefeProyectoId: true },
  },
  usuario: { select: { id: true, name: true, lastName: true } },
  empleado: { select: { id: true, nombreCompleto: true } },
};

@Injectable()
export class ActividadesDiariasRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.actividadDiaria.findFirst({
      where: { id, deletedAt: null },
      include: includeActividad,
    });
  }

  findByClave(claveOperacion: string) {
    return this.prisma.actividadDiaria.findUnique({
      where: { claveOperacion },
      include: includeActividad,
    });
  }

  findUsuario(usuarioId: number) {
    return this.prisma.user.findFirst({
      where: { id: usuarioId, deletedAt: null },
      select: {
        id: true,
        empleadoId: true,
        role: { select: { name: true } },
      },
    });
  }

  findProyecto(proyectoId: number) {
    return this.prisma.proyecto.findFirst({
      where: { id: proyectoId, deletedAt: null },
      select: {
        id: true,
        nombre: true,
        estado: true,
        jefeProyectoId: true,
      },
    });
  }

  findProyectosDisponibles(empleadoId: number | null, esAdmin: boolean) {
    if (!esAdmin && !empleadoId) return Promise.resolve([]);
    return this.prisma.proyecto.findMany({
      where: {
        deletedAt: null,
        estado: 'ACTIVO',
        ...(esAdmin ? {} : { jefeProyectoId: empleadoId }),
      },
      select: {
        id: true,
        nombre: true,
        cliente: true,
        ubicacion: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  private buildWhereFecha(fechaInicio?: Date, fechaFin?: Date) {
    if (!fechaInicio && !fechaFin) return {};
    return {
      fecha: {
        ...(fechaInicio ? { gte: fechaInicio } : {}),
        ...(fechaFin ? { lte: fechaFin } : {}),
      },
    };
  }

  findPorProyecto(
    proyectoId: number,
    rango?: { fechaInicio?: Date; fechaFin?: Date },
  ) {
    return this.prisma.actividadDiaria.findMany({
      where: {
        proyectoId,
        deletedAt: null,
        ...this.buildWhereFecha(rango?.fechaInicio, rango?.fechaFin),
      },
      include: includeActividad,
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findAccesibles(
    empleadoId: number | null,
    esAdmin: boolean,
    rango?: { fechaInicio?: Date; fechaFin?: Date },
  ) {
    if (!esAdmin && !empleadoId) return Promise.resolve([]);
    return this.prisma.actividadDiaria.findMany({
      where: {
        deletedAt: null,
        ...this.buildWhereFecha(rango?.fechaInicio, rango?.fechaFin),
        proyecto: {
          deletedAt: null,
          estado: 'ACTIVO',
          ...(esAdmin ? {} : { jefeProyectoId: empleadoId }),
        },
      },
      include: includeActividad,
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    });
  }

  crear(datos: DatosCrearActividad) {
    return this.prisma.actividadDiaria.create({
      data: {
        claveOperacion: datos.claveOperacion,
        proyectoId: datos.proyectoId,
        usuarioId: datos.usuarioId,
        empleadoId: datos.empleadoId,
        fecha: datos.fecha,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        observaciones: datos.observaciones ?? null,
      },
      include: includeActividad,
    });
  }

  actualizar(id: number, datos: DatosActualizarActividad) {
    return this.prisma.actividadDiaria.update({
      where: { id },
      data: {
        ...(datos.proyectoId !== undefined
          ? { proyectoId: datos.proyectoId }
          : {}),
        ...(datos.fecha ? { fecha: datos.fecha } : {}),
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        observaciones: datos.observaciones,
      },
      include: includeActividad,
    });
  }
}
