import { PrismaService } from '@/prisma/prisma.service';
import {
  MotivoMovimientoMaterial,
  Prisma,
  TipoMovimientoMaterial,
  TipoUbicacionMaterial,
} from '@gen/prisma/client';
import { Injectable } from '@nestjs/common';

export type DireccionMovimiento = 'ENTRADA' | 'SALIDA';

export class InventarioOperacionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export type DatosMovimiento = {
  claveOperacion: string;
  materialId: number;
  cantidad: Prisma.Decimal;
  motivo: MotivoMovimientoMaterial;
  proyectoId?: number;
  observacion?: string;
};

const movimientoInclude = {
  material: { select: { id: true, codigo: true, nombre: true, unidad: true } },
  origen: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      tipo: true,
      proyectoId: true,
    },
  },
  destino: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      tipo: true,
      proyectoId: true,
    },
  },
  usuario: { select: { id: true, name: true, lastName: true } },
} satisfies Prisma.MovimientoMaterialInclude;

@Injectable()
export class InventarioMaterialesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMovimientoByKey(claveOperacion: string) {
    return this.prisma.movimientoMaterial.findUnique({
      where: { claveOperacion },
      include: movimientoInclude,
    });
  }

  findMaterial(id: number) {
    return this.prisma.material.findUnique({
      where: { id },
      select: { id: true, nombre: true, unidad: true },
    });
  }

  findExistencias(materialId?: number, proyectoId?: number) {
    return this.prisma.existenciaMaterial.findMany({
      where: {
        materialId,
        ubicacion: proyectoId === undefined ? undefined : { proyectoId },
      },
      include: {
        material: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            unidad: true,
            estado: true,
          },
        },
        ubicacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo: true,
            proyectoId: true,
          },
        },
      },
      orderBy: [
        { material: { nombre: 'asc' } },
        { ubicacion: { nombre: 'asc' } },
      ],
    });
  }

  findMovimientos(filters: {
    materialId?: number;
    proyectoId?: number;
    desde?: Date;
    hasta?: Date;
  }) {
    return this.prisma.movimientoMaterial.findMany({
      where: {
        materialId: filters.materialId,
        fechaMovimiento:
          filters.desde || filters.hasta
            ? { gte: filters.desde, lte: filters.hasta }
            : undefined,
        OR:
          filters.proyectoId === undefined
            ? undefined
            : [
                { origen: { proyectoId: filters.proyectoId } },
                { destino: { proyectoId: filters.proyectoId } },
              ],
      },
      include: movimientoInclude,
      orderBy: { fechaMovimiento: 'desc' },
      take: 500,
    });
  }

  async registrar(
    direccion: DireccionMovimiento,
    datos: DatosMovimiento,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({
        where: { id: datos.materialId },
        select: { id: true },
      });
      if (!material)
        throw new InventarioOperacionError('MATERIAL_NO_ENCONTRADO');

      const bodega = await tx.ubicacionMaterial.findUnique({
        where: { codigo: 'BODEGA-GENERAL' },
      });
      if (!bodega) throw new InventarioOperacionError('BODEGA_NO_CONFIGURADA');

      let ubicacionProyecto: { id: number } | null = null;
      if (datos.proyectoId !== undefined) {
        const proyecto = await tx.proyecto.findFirst({
          where: { id: datos.proyectoId, deletedAt: null },
          select: { id: true, nombre: true, estado: true },
        });
        if (!proyecto)
          throw new InventarioOperacionError('PROYECTO_NO_ENCONTRADO');
        if (proyecto.estado === 'CANCELADO') {
          throw new InventarioOperacionError('PROYECTO_CANCELADO');
        }
        ubicacionProyecto = await tx.ubicacionMaterial.upsert({
          where: { codigo: `PROYECTO-${proyecto.id}` },
          update: { nombre: proyecto.nombre, proyectoId: proyecto.id },
          create: {
            codigo: `PROYECTO-${proyecto.id}`,
            nombre: proyecto.nombre,
            tipo: TipoUbicacionMaterial.PROYECTO,
            proyectoId: proyecto.id,
          },
          select: { id: true },
        });
      }

      const esTraslado =
        datos.motivo === MotivoMovimientoMaterial.USO_PROYECTO ||
        datos.motivo === MotivoMovimientoMaterial.DEVOLUCION_PROYECTO;
      const origenId =
        direccion === 'SALIDA'
          ? bodega.id
          : esTraslado
            ? ubicacionProyecto!.id
            : null;
      const destinoId =
        direccion === 'ENTRADA'
          ? bodega.id
          : esTraslado
            ? ubicacionProyecto!.id
            : null;

      await tx.movimientoMaterial.create({
        data: {
          claveOperacion: datos.claveOperacion,
          materialId: datos.materialId,
          cantidad: datos.cantidad,
          tipo: esTraslado
            ? TipoMovimientoMaterial.TRASLADO
            : direccion === 'ENTRADA'
              ? TipoMovimientoMaterial.ENTRADA
              : TipoMovimientoMaterial.SALIDA,
          motivo: datos.motivo,
          origenId,
          destinoId,
          usuarioId,
          observacion: datos.observacion || null,
        },
      });

      if (origenId !== null) {
        const descontado = await tx.existenciaMaterial.updateMany({
          where: {
            materialId: datos.materialId,
            ubicacionId: origenId,
            cantidad: { gte: datos.cantidad },
          },
          data: { cantidad: { decrement: datos.cantidad } },
        });
        if (descontado.count !== 1) {
          throw new InventarioOperacionError('SALDO_INSUFICIENTE');
        }
      }

      if (destinoId !== null) {
        await tx.existenciaMaterial.upsert({
          where: {
            materialId_ubicacionId: {
              materialId: datos.materialId,
              ubicacionId: destinoId,
            },
          },
          update: { cantidad: { increment: datos.cantidad } },
          create: {
            materialId: datos.materialId,
            ubicacionId: destinoId,
            cantidad: datos.cantidad,
          },
        });
      }

      const movimiento = await tx.movimientoMaterial.findUniqueOrThrow({
        where: { claveOperacion: datos.claveOperacion },
        include: movimientoInclude,
      });
      return movimiento;
    });
  }
}
