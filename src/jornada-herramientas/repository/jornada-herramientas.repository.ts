import { PrismaService } from '@/prisma/prisma.service';
import { EstadoVerificacionHerramienta } from '@gen/prisma/client';
import { Injectable } from '@nestjs/common';

const includeDetalle = {
  proyecto: {
    select: { id: true, nombre: true, estado: true, jefeProyectoId: true },
  },
  empleado: { select: { id: true, nombreCompleto: true } },
  creadoPor: { select: { id: true, name: true, lastName: true } },
  items: {
    include: {
      herramienta: {
        select: {
          id: true,
          codigoUnico: true,
          nombre: true,
          estado: true,
          tipo: { select: { nombre: true } },
        },
      },
      incidencia: { select: { id: true, titulo: true, estado: true } },
    },
    orderBy: { id: 'asc' as const },
  },
};

export interface DatosCrearJornada {
  claveOperacion: string;
  proyectoId: number;
  empleadoId: number;
  fecha: Date;
  creadoPorId: number;
  herramientaIds: number[];
}

@Injectable()
export class JornadaHerramientasRepository {
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

  /** Verifica que el técnico tenga una asignación vigente a ese proyecto. */
  asignacionVigente(proyectoId: number, empleadoId: number) {
    return this.prisma.proyectoEmpleado.findFirst({
      where: { proyectoId, empleadoId, fechaRetiro: null },
      select: { empleadoId: true },
    });
  }

  /** Herramientas actualmente despachadas (EN_PROYECTO) a ese proyecto. */
  herramientasDespachadas(proyectoId: number) {
    return this.prisma.herramienta.findMany({
      where: { proyectoId, estado: 'EN_PROYECTO' },
      select: { id: true },
    });
  }

  findByClave(claveOperacion: string) {
    return this.prisma.jornadaHerramientas.findUnique({
      where: { claveOperacion },
      include: includeDetalle,
    });
  }

  findByUnique(proyectoId: number, empleadoId: number, fecha: Date) {
    return this.prisma.jornadaHerramientas.findUnique({
      where: { proyectoId_empleadoId_fecha: { proyectoId, empleadoId, fecha } },
      include: includeDetalle,
    });
  }

  findById(id: number) {
    return this.prisma.jornadaHerramientas.findUnique({
      where: { id },
      include: includeDetalle,
    });
  }

  crear(datos: DatosCrearJornada) {
    return this.prisma.jornadaHerramientas.create({
      data: {
        claveOperacion: datos.claveOperacion,
        proyectoId: datos.proyectoId,
        empleadoId: datos.empleadoId,
        fecha: datos.fecha,
        creadoPorId: datos.creadoPorId,
        items: {
          create: datos.herramientaIds.map((herramientaId) => ({
            herramientaId,
          })),
        },
      },
      include: includeDetalle,
    });
  }

  actualizarItemInicio(
    itemId: number,
    estado: EstadoVerificacionHerramienta,
    observacion: string | null,
  ) {
    return this.prisma.jornadaHerramientaItem.update({
      where: { id: itemId },
      data: { estadoInicio: estado, observacionInicio: observacion },
    });
  }

  confirmarInicio(id: number) {
    return this.prisma.jornadaHerramientas.update({
      where: { id },
      data: { verificacionInicioAt: new Date() },
      include: includeDetalle,
    });
  }
}
