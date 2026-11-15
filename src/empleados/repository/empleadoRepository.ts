import { PrismaService } from '@/prisma/prisma.service';
import { Empleado, Prisma } from '@gen/prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';

type DatosEmpleado = Pick<
  Empleado,
  'nombreCompleto' | 'dui' | 'nit' | 'cargoId' | 'activo'
>;

const empleadoInclude = {
  cargo: true,
  habilidades: { include: { habilidad: true } },
} satisfies Prisma.EmpleadoInclude;

// Repositorio para la tabla `empleados`
// Maneja todas las operaciones CRUD con la BD usando Prisma
@Injectable()
export class EmpleadoRepository {
  constructor(private readonly prisma: PrismaService) {}
  // Obtiene todos los empleados
  findMany() {
    return this.prisma.models.empleado.findMany({
      include: empleadoInclude,
    });
  }
  // Busca un empleado por id
  findUnique(id: number) {
    return this.prisma.models.empleado.findUnique({
      where: { id },
      include: empleadoInclude,
    });
  }
  // Empleados activos con sus asignaciones de proyecto vigentes (GPRCIMPER-83)
  findAsignaciones() {
    return this.prisma.models.empleado.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        nombreCompleto: true,
        activo: true,
        cargo: { select: { nombre: true } },
        proyectos: {
          where: { fechaRetiro: null, proyecto: { estado: { not: 'FINALIZADO' } } },
          select: {
            fechaAsignacion: true,
            proyecto: { select: { id: true, nombre: true, estado: true } },
          },
          orderBy: { fechaAsignacion: 'desc' },
        },
        // Proyectos donde el empleado es el jefe (no pasa por la tabla pivote de técnicos).
        proyectosComoJefe: {
          where: { deletedAt: null, estado: { not: 'FINALIZADO' } },
          select: { id: true, nombre: true, estado: true },
        },
      },
      orderBy: { nombreCompleto: 'asc' },
    });
  }
  // Empleado vinculado al usuario autenticado, para las rutas "mis
  // asignaciones" (GPRCIMPER-122).
  findEmpleadoIdPorUsuario(userId: number) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { empleadoId: true },
    });
  }

  // Proyectos activos asignados al empleado, para que el técnico vea sus
  // tareas pendientes (GPRCIMPER-122).
  findMisAsignaciones(empleadoId: number) {
    return this.prisma.proyectoEmpleado.findMany({
      where: {
        empleadoId,
        fechaRetiro: null,
        proyecto: { deletedAt: null, estado: { notIn: ['FINALIZADO', 'CANCELADO'] } },
      },
      select: {
        vistaAt: true,
        proyecto: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
      },
      orderBy: { fechaAsignacion: 'desc' },
    });
  }

  // Proyectos activos donde el empleado es el jefe de proyecto (no pasa por
  // la tabla pivote de técnicos) — un jefe también debe ver sus proyectos en
  // "Mis proyectos" (GPRCIMPER-122).
  findMisProyectosComoJefe(empleadoId: number) {
    return this.prisma.proyecto.findMany({
      where: {
        jefeProyectoId: empleadoId,
        deletedAt: null,
        estado: { notIn: ['FINALIZADO', 'CANCELADO'] },
      },
      select: {
        id: true,
        nombre: true,
        ubicacion: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
      },
      orderBy: { fechaInicio: 'desc' },
    });
  }

  // Detalle de un proyecto propio como jefe, mismo shape que
  // findMiAsignacionDetalle para que el service pueda combinarlos
  // (GPRCIMPER-122).
  findMiProyectoComoJefe(empleadoId: number, proyectoId: number) {
    return this.prisma.proyecto.findFirst({
      where: { id: proyectoId, jefeProyectoId: empleadoId, deletedAt: null },
      select: {
        id: true,
        nombre: true,
        ubicacion: true,
        descripcion: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        jefeProyecto: {
          select: {
            nombreCompleto: true,
            user: { select: { email: true } },
          },
        },
      },
    });
  }

  // Detalle de una asignación propia, con datos de contacto del jefe de
  // proyecto (GPRCIMPER-122).
  findMiAsignacionDetalle(empleadoId: number, proyectoId: number) {
    return this.prisma.proyectoEmpleado.findFirst({
      where: {
        empleadoId,
        proyectoId,
        fechaRetiro: null,
        proyecto: { deletedAt: null },
      },
      select: {
        vistaAt: true,
        proyecto: {
          select: {
            id: true,
            nombre: true,
            ubicacion: true,
            descripcion: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            jefeProyecto: {
              select: {
                nombreCompleto: true,
                user: { select: { email: true } },
              },
            },
          },
        },
      },
    });
  }

  // Marca la asignación como vista la primera vez que el técnico abre el
  // detalle; no pisa la fecha si ya se había visualizado (GPRCIMPER-122).
  marcarAsignacionVista(empleadoId: number, proyectoId: number) {
    return this.prisma.proyectoEmpleado.updateMany({
      where: { empleadoId, proyectoId, vistaAt: null },
      data: { vistaAt: new Date() },
    });
  }

  // Consulta sin el filtro de borrado lógico: un empleado eliminado todavía
  // ocupa su DUI y NIT en los índices únicos de la base de datos.
  findDocumentConflicts(dui: string, nit: string) {
    return this.prisma.empleado.findMany({
      where: { OR: [{ dui }, { nit }] },
      select: { dui: true, nit: true },
      take: 2,
    });
  }
  // Crea un nuevo empleado
  create(data: DatosEmpleado, habilidadesIds: number[] = []) {
    return this.prisma.models.$transaction(async (tx) => {
      await this.validarHabilidades(tx, habilidadesIds);
      return tx.empleado.create({
        data: {
          ...data,
          ...(habilidadesIds.length > 0 && {
            habilidades: {
              createMany: {
                data: habilidadesIds.map((habilidadId) => ({ habilidadId })),
              },
            },
          }),
        },
        include: empleadoInclude,
      });
    });
  }
  // Actualiza un empleado por id
  update(id: number, data: Partial<DatosEmpleado>, habilidadesIds?: number[]) {
    return this.prisma.models.$transaction(async (tx) => {
      if (habilidadesIds !== undefined) {
        await this.validarHabilidades(tx, habilidadesIds);
      }

      return tx.empleado.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          ...(habilidadesIds !== undefined && {
            habilidades: {
              // Conservamos la auditoría de las asignaciones que no cambiaron.
              deleteMany: { habilidadId: { notIn: habilidadesIds } },
              ...(habilidadesIds.length > 0 && {
                createMany: {
                  data: habilidadesIds.map((habilidadId) => ({ habilidadId })),
                  skipDuplicates: true,
                },
              }),
            },
          }),
        },
        include: empleadoInclude,
      });
    });
  }

  private async validarHabilidades(
    tx: Pick<PrismaService['models'], 'habilidad'>,
    habilidadesIds: number[],
  ) {
    if (habilidadesIds.length === 0) return;
    const habilidades = await tx.habilidad.findMany({
      where: { id: { in: habilidadesIds } },
      select: { id: true },
    });
    const existentes = new Set(habilidades.map(({ id }) => id));
    const faltantes = habilidadesIds.filter((id) => !existentes.has(id));
    if (faltantes.length > 0) {
      throw new BadRequestException({
        message: {
          habilidadesIds: [
            `Las habilidades ${faltantes.join(', ')} ya no existen en el catálogo. Actualiza la lista e inténtalo de nuevo.`,
          ],
        },
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  }
  // Elimina un empleado por id
  delete(id: number) {
    return this.prisma.models.empleado.delete({ where: { id } });
  }
  // Exponemos el cliente de Prisma para manejar transacciones complejas en el Service
  get prClient() {
    return this.prisma;
  }
}
