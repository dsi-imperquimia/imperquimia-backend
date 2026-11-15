import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';

@Injectable()
export class HerramientaRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where?: Prisma.HerramientaWhereInput) {
    return this.prisma.herramienta.findMany({
      where,
      include: { proyecto: true, tipo: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUnique(id: number) {
    return this.prisma.herramienta.findUnique({
      where: { id },
      include: {
        proyecto: true,
        tipo: true,
        movimientos: {
          orderBy: { fechaMovimiento: 'desc' },
          take: 10,
          include: {
            usuario: { select: { id: true, name: true, lastName: true } },
            proyectoDestino: { select: { id: true, nombre: true } },
          },
        },
      },
    });
  }

  findAsignada(id: number, empleadoId: number) {
    return this.prisma.herramienta.findFirst({
      where: {
        id,
        proyecto: {
          is: {
            deletedAt: null,
            OR: [
              { jefeProyectoId: empleadoId },
              { empleados: { some: { empleadoId, fechaRetiro: null } } },
            ],
          },
        },
      },
      include: {
        proyecto: true,
        tipo: true,
        movimientos: {
          orderBy: { fechaMovimiento: 'desc' },
          take: 10,
          include: {
            usuario: { select: { id: true, name: true, lastName: true } },
            proyectoDestino: { select: { id: true, nombre: true } },
          },
        },
      },
    });
  }

  async alcanceLectura(usuarioId: number) {
    const permisoCompleto = {
      permission: { name: 'HERRAMIENTA_READ', deletedAt: null },
    };
    const usuario = await this.prisma.user.findFirst({
      where: { id: usuarioId, deletedAt: null },
      select: {
        empleadoId: true,
        permissions: {
          where: permisoCompleto,
          select: { permissionId: true },
        },
        role: {
          select: {
            deletedAt: true,
            permissions: {
              where: permisoCompleto,
              select: { permissionId: true },
            },
          },
        },
      },
    });
    return {
      empleadoId: usuario?.empleadoId ?? null,
      completo:
        Boolean(usuario?.permissions.length) ||
        (usuario?.role?.deletedAt === null &&
          Boolean(usuario.role.permissions.length)),
    };
  }

  findByCodigoUnico(codigoUnico: string) {
    return this.prisma.herramienta.findUnique({ where: { codigoUnico } });
  }

  findProyectoAsignable(id: number) {
    return this.prisma.proyecto.findFirst({
      where: { id, deletedAt: null, estado: 'ACTIVO' },
      select: { id: true },
    });
  }

  create(data: Prisma.HerramientaUncheckedCreateInput) {
    return this.prisma.herramienta.create({ data, include: { tipo: true } });
  }

  update(id: number, data: Prisma.HerramientaUncheckedUpdateInput) {
    return this.prisma.herramienta.update({
      where: { id },
      data,
      include: { tipo: true },
    });
  }

  async usuarioPuedeOperarHerramienta(
    usuarioId: number,
    herramientaId: number,
  ) {
    const usuario = await this.prisma.user.findFirst({
      where: { id: usuarioId, deletedAt: null },
      select: { roleId: true, empleadoId: true },
    });
    if (!usuario) return false;
    if (usuario.roleId === 1) return true;
    if (usuario.empleadoId === null) return false;

    const herramienta = await this.prisma.herramienta.findUnique({
      where: { id: herramientaId },
      select: { proyectoId: true },
    });
    if (!herramienta?.proyectoId) return false;

    const proyecto = await this.prisma.proyecto.findFirst({
      where: {
        id: herramienta.proyectoId,
        deletedAt: null,
        OR: [
          { jefeProyectoId: usuario.empleadoId },
          {
            empleados: {
              some: {
                empleadoId: usuario.empleadoId,
                fechaRetiro: null,
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    return Boolean(proyecto);
  }

  crearReporteDefecto(data: {
    herramientaId: number;
    observacion: string | null;
    reportadoPorId: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.herramienta.updateMany({
        where: {
          id: data.herramientaId,
          estado: { notIn: ['REQUIERE_REVISION', 'DESECHO'] },
        },
        data: { estado: 'REQUIERE_REVISION' },
      });
      if (actualizada.count !== 1) {
        throw new Error('REPORTE_PENDIENTE');
      }

      const herramienta = await tx.herramienta.findUniqueOrThrow({
        where: { id: data.herramientaId },
        select: { proyectoId: true },
      });
      return tx.reporteDefectoHerramienta.create({
        data: {
          herramientaId: data.herramientaId,
          proyectoId: herramienta.proyectoId,
          observacion: data.observacion,
          reportadoPorId: data.reportadoPorId,
        },
        include: {
          reportadoPor: {
            select: { id: true, name: true, lastName: true },
          },
          proyecto: { select: { id: true, nombre: true } },
        },
      });
    });
  }

  findReportesDefecto(herramientaId: number) {
    return this.prisma.reporteDefectoHerramienta.findMany({
      where: { herramientaId },
      orderBy: { createdAt: 'desc' },
      include: {
        reportadoPor: {
          select: { id: true, name: true, lastName: true },
        },
        proyecto: { select: { id: true, nombre: true } },
      },
    });
  }
}
