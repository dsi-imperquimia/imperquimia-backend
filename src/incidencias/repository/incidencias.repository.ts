import { PrismaService } from '@/prisma/prisma.service';
import {
  EstadoIncidencia,
  Prisma,
  PrioridadIncidencia,
} from '@gen/prisma/client';
import { Injectable } from '@nestjs/common';

export interface DatosCrearIncidencia {
  claveOperacion: string;
  proyectoId: number;
  usuarioId: number;
  titulo: string;
  descripcion: string;
  fecha: Date;
  prioridad: PrioridadIncidencia;
  actividadDiariaId?: number;
}

export interface FiltrosIncidencias {
  proyectoId?: number;
  estado?: EstadoIncidencia;
  prioridad?: PrioridadIncidencia;
  actividadDiariaId?: number;
  /** Si se define, solo proyectos cuyo jefe es este empleado. */
  jefeProyectoId?: number;
}

const includeListado = {
  proyecto: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, name: true, lastName: true } },
  actividadDiaria: { select: { id: true, nombre: true, fecha: true } },
};

const includeDetalle = {
  proyecto: {
    select: { id: true, nombre: true, estado: true, jefeProyectoId: true },
  },
  usuario: { select: { id: true, name: true, lastName: true } },
  actividadDiaria: {
    select: { id: true, nombre: true, fecha: true, proyectoId: true },
  },
  historial: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    include: { usuario: { select: { id: true, name: true, lastName: true } } },
  },
};

@Injectable()
export class IncidenciasRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUsuario(usuarioId: number) {
    return this.prisma.user.findFirst({
      where: { id: usuarioId, deletedAt: null },
      select: { id: true, empleadoId: true, role: { select: { name: true } } },
    });
  }

  findProyecto(proyectoId: number) {
    return this.prisma.proyecto.findFirst({
      where: { id: proyectoId, deletedAt: null },
      select: { id: true, nombre: true, estado: true, jefeProyectoId: true },
    });
  }

  findById(id: number) {
    return this.prisma.incidencia.findFirst({
      where: { id, deletedAt: null },
      include: includeDetalle,
    });
  }

  findByClave(claveOperacion: string) {
    return this.prisma.incidencia.findUnique({
      where: { claveOperacion },
      include: includeDetalle,
    });
  }

  findMany(filtros: FiltrosIncidencias) {
    const where: Prisma.IncidenciaWhereInput = {
      deletedAt: null,
      ...(filtros.proyectoId ? { proyectoId: filtros.proyectoId } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.prioridad ? { prioridad: filtros.prioridad } : {}),
      ...(filtros.actividadDiariaId
        ? { actividadDiariaId: filtros.actividadDiariaId }
        : {}),
      proyecto: {
        deletedAt: null,
        ...(filtros.jefeProyectoId
          ? { jefeProyectoId: filtros.jefeProyectoId }
          : {}),
      },
    };
    return this.prisma.incidencia.findMany({
      where,
      include: includeListado,
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    });
  }

  /** Crea la incidencia y la primera fila del historial de forma atómica. */
  crear(datos: DatosCrearIncidencia) {
    return this.prisma.incidencia.create({
      data: {
        ...datos,
        historial: {
          create: {
            usuarioId: datos.usuarioId,
            estadoAnterior: null,
            estadoNuevo: 'ABIERTA',
            comentario: 'Incidencia registrada',
          },
        },
      },
      include: includeDetalle,
    });
  }

  actualizar(id: number, data: Prisma.IncidenciaUpdateInput) {
    return this.prisma.incidencia.update({
      where: { id },
      data,
      include: includeDetalle,
    });
  }

  /** Cambia el estado y registra el cambio en el historial (atómico). */
  cambiarEstado(
    id: number,
    usuarioId: number,
    estadoAnterior: EstadoIncidencia,
    estadoNuevo: EstadoIncidencia,
    comentario: string | null,
  ) {
    return this.prisma.incidencia.update({
      where: { id },
      data: {
        estado: estadoNuevo,
        historial: {
          create: { usuarioId, estadoAnterior, estadoNuevo, comentario },
        },
      },
      include: includeDetalle,
    });
  }

  /** Borrado lógico: conserva el historial y deja de listarse. */
  eliminar(id: number) {
    return this.prisma.incidencia.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  findActividad(id: number) {
    return this.prisma.actividadDiaria.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nombre: true,
        proyectoId: true,
        proyecto: { select: { jefeProyectoId: true } },
      },
    });
  }

  findPorIds(ids: number[]) {
    return this.prisma.incidencia.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, proyectoId: true, actividadDiariaId: true },
    });
  }

  /**
   * Deja exactamente `incidenciaIds` vinculadas a la actividad: desvincula
   * las que ya no están y vincula las nuevas, en una sola transacción.
   */
  async reemplazarVinculos(actividadDiariaId: number, incidenciaIds: number[]) {
    await this.prisma.$transaction([
      this.prisma.incidencia.updateMany({
        where: {
          actividadDiariaId,
          id: { notIn: incidenciaIds },
        },
        data: { actividadDiariaId: null },
      }),
      this.prisma.incidencia.updateMany({
        where: { id: { in: incidenciaIds } },
        data: { actividadDiariaId },
      }),
    ]);
    return this.findMany({ actividadDiariaId });
  }
}
