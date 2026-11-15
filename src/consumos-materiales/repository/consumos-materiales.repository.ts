import { PrismaService } from '@/prisma/prisma.service';
import {
  ClasificacionConsumoMaterial,
  FuenteConsumoMaterial,
  MotivoMovimientoMaterial,
  Prisma,
  TipoMovimientoMaterial,
} from '@gen/prisma/client';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export class ConsumoOperacionError extends Error {
  constructor(
    public readonly code: string,
    public readonly details?: {
      cantidadDisponible?: string;
      cantidad?: number;
    },
  ) {
    super(code);
  }
}

export type DatosConsumo = {
  claveOperacion: string;
  proyectoId: number;
  materialId: number;
  cantidad: Prisma.Decimal;
  clasificacion: ClasificacionConsumoMaterial;
  fechaJornada: Date;
  motivo?: string;
  actividadReferencia?: string;
  reporteReferencia?: string;
};

export type DatosDesviacion = {
  consumoId: number;
  proyectoId: number;
  materialId: number;
  regla: 'EXCESO_COTIZADO';
  valorObservado: Prisma.Decimal;
  valorReferencia: Prisma.Decimal;
  factorUmbral: Prisma.Decimal;
};

const consumoInclude = {
  proyecto: { select: { id: true, nombre: true, estado: true } },
  material: { select: { id: true, codigo: true, nombre: true, unidad: true } },
  usuario: { select: { id: true, name: true, lastName: true } },
  anuladoPor: { select: { id: true, name: true, lastName: true } },
  movimiento: { select: { id: true, fechaMovimiento: true } },
  movimientoReverso: { select: { id: true, fechaMovimiento: true } },
} satisfies Prisma.ConsumoMaterialInclude;

@Injectable()
export class ConsumosMaterialesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findConsumoByKey(claveOperacion: string) {
    return this.prisma.consumoMaterial.findUnique({
      where: { claveOperacion },
      include: consumoInclude,
    });
  }

  findConsumoById(id: number) {
    return this.prisma.consumoMaterial.findUnique({
      where: { id },
      include: consumoInclude,
    });
  }

  async usuarioPuedeOperarProyecto(
    usuarioId: number,
    proyectoId: number,
    requiereAsignacionActiva: boolean,
  ) {
    const usuario = await this.prisma.user.findFirst({
      where: {
        id: usuarioId,
        deletedAt: null,
        OR: [
          { role: { is: { id: 1, deletedAt: null } } },
          {
            empleado: {
              is: {
                OR: [
                  { proyectosComoJefe: { some: { id: proyectoId } } },
                  {
                    proyectos: {
                      some: {
                        proyectoId,
                        fechaRetiro: requiereAsignacionActiva
                          ? null
                          : undefined,
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    return Boolean(usuario);
  }

  findProyecto(proyectoId: number) {
    return this.prisma.proyecto.findFirst({
      where: { id: proyectoId, deletedAt: null },
      select: { id: true, nombre: true, estado: true },
    });
  }

  findConsumos(proyectoId: number) {
    return this.prisma.consumoMaterial.findMany({
      where: { proyectoId },
      include: consumoInclude,
      orderBy: [{ fechaJornada: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async findResumenData(proyectoId: number) {
    const [detalles, existencias, movimientos, consumos] = await Promise.all([
      this.prisma.detalleProyecto.findMany({
        where: { proyectoId },
        select: {
          materialId: true,
          cantidad: true,
          material: {
            select: { id: true, codigo: true, nombre: true, unidad: true },
          },
        },
      }),
      this.prisma.existenciaMaterial.findMany({
        where: { ubicacion: { proyectoId } },
        select: {
          materialId: true,
          cantidad: true,
          material: {
            select: { id: true, codigo: true, nombre: true, unidad: true },
          },
        },
      }),
      this.prisma.movimientoMaterial.findMany({
        where: {
          motivo: {
            in: [
              MotivoMovimientoMaterial.USO_PROYECTO,
              MotivoMovimientoMaterial.DEVOLUCION_PROYECTO,
            ],
          },
          OR: [{ origen: { proyectoId } }, { destino: { proyectoId } }],
        },
        select: {
          materialId: true,
          cantidad: true,
          motivo: true,
          material: {
            select: { id: true, codigo: true, nombre: true, unidad: true },
          },
        },
      }),
      this.prisma.consumoMaterial.findMany({
        where: { proyectoId, anuladoAt: null },
        select: {
          materialId: true,
          cantidad: true,
          clasificacion: true,
          material: {
            select: { id: true, codigo: true, nombre: true, unidad: true },
          },
        },
      }),
    ]);
    return { detalles, existencias, movimientos, consumos };
  }

  async findDatosDesviaciones(proyectoId: number) {
    const [detalles, consumos] = await Promise.all([
      this.prisma.detalleProyecto.findMany({
        where: { proyectoId },
        select: { materialId: true, cantidad: true },
      }),
      this.prisma.consumoMaterial.findMany({
        where: {
          proyectoId,
          anuladoAt: null,
          clasificacion: { not: ClasificacionConsumoMaterial.CIERRE },
        },
        select: {
          id: true,
          proyectoId: true,
          materialId: true,
          cantidad: true,
          fechaJornada: true,
          clasificacion: true,
        },
        orderBy: [
          { materialId: 'asc' },
          { fechaJornada: 'asc' },
          { id: 'asc' },
        ],
      }),
    ]);
    return { detalles, consumos };
  }

  sincronizarDesviaciones(proyectoId: number, datos: DatosDesviacion[]) {
    return this.prisma.$transaction(async (tx) => {
      const existentes = await tx.desviacionConsumo.findMany({
        where: { proyectoId },
        select: {
          id: true,
          consumoId: true,
          regla: true,
          valorObservado: true,
          valorReferencia: true,
          factorUmbral: true,
          activa: true,
        },
      });
      const clave = (consumoId: number, regla: string) =>
        `${consumoId}:${regla}`;
      const deseadas = new Set(
        datos.map((item) => clave(item.consumoId, item.regla)),
      );
      const desactivar = existentes
        .filter(
          (item) =>
            item.activa && !deseadas.has(clave(item.consumoId, item.regla)),
        )
        .map((item) => item.id);
      if (desactivar.length) {
        await tx.desviacionConsumo.updateMany({
          where: { id: { in: desactivar } },
          data: { activa: false },
        });
      }

      const porClave = new Map(
        existentes.map((item) => [clave(item.consumoId, item.regla), item]),
      );
      for (const item of datos) {
        const actual = porClave.get(clave(item.consumoId, item.regla));
        if (
          actual?.activa &&
          actual.valorObservado.equals(item.valorObservado) &&
          actual.valorReferencia.equals(item.valorReferencia) &&
          actual.factorUmbral.equals(item.factorUmbral)
        ) {
          continue;
        }
        await tx.desviacionConsumo.upsert({
          where: {
            consumoId_regla: {
              consumoId: item.consumoId,
              regla: item.regla,
            },
          },
          update: {
            valorObservado: item.valorObservado,
            valorReferencia: item.valorReferencia,
            factorUmbral: item.factorUmbral,
            activa: true,
          },
          create: item,
        });
      }
      return tx.desviacionConsumo.findMany({
        where: { proyectoId, activa: true },
        include: {
          material: {
            select: { id: true, codigo: true, nombre: true, unidad: true },
          },
          consumo: {
            select: {
              id: true,
              cantidad: true,
              fechaJornada: true,
              clasificacion: true,
              fuente: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    });
  }

  async findDatosReporte(proyectoId: number, desde?: Date, hasta?: Date) {
    const [proyecto, consumos] = await Promise.all([
      this.prisma.proyecto.findFirst({
        where: { id: proyectoId, deletedAt: null },
        select: { id: true, nombre: true, ubicacion: true },
      }),
      this.prisma.consumoMaterial.findMany({
        where: {
          proyectoId,
          anuladoAt: null,
          fechaJornada:
            desde || hasta
              ? {
                  ...(desde ? { gte: desde } : {}),
                  ...(hasta ? { lte: hasta } : {}),
                }
              : undefined,
        },
        select: {
          materialId: true,
          cantidad: true,
          clasificacion: true,
          fechaJornada: true,
          material: {
            select: { id: true, codigo: true, nombre: true, unidad: true },
          },
        },
        orderBy: [{ materialId: 'asc' }, { fechaJornada: 'asc' }],
      }),
    ]);
    return { proyecto, consumos };
  }

  async registrar(datos: DatosConsumo, usuarioId: number) {
    return this.prisma.$transaction(async (tx) => {
      const proyecto = await tx.proyecto.findFirst({
        where: { id: datos.proyectoId, deletedAt: null },
        select: { id: true, estado: true },
      });
      if (!proyecto) throw new ConsumoOperacionError('PROYECTO_NO_ENCONTRADO');
      if (proyecto.estado !== 'ACTIVO')
        throw new ConsumoOperacionError('PROYECTO_NO_ACTIVO');

      const material = await tx.material.findUnique({
        where: { id: datos.materialId },
        select: { id: true, estado: true },
      });
      if (!material) throw new ConsumoOperacionError('MATERIAL_NO_ENCONTRADO');
      if (!material.estado)
        throw new ConsumoOperacionError('MATERIAL_INACTIVO');

      const ubicacion = await tx.ubicacionMaterial.findUnique({
        where: { proyectoId: datos.proyectoId },
        select: { id: true },
      });
      if (!ubicacion)
        throw new ConsumoOperacionError('SALDO_INSUFICIENTE', {
          cantidadDisponible: '0',
        });

      const descontado = await tx.existenciaMaterial.updateMany({
        where: {
          materialId: datos.materialId,
          ubicacionId: ubicacion.id,
          cantidad: { gte: datos.cantidad },
        },
        data: { cantidad: { decrement: datos.cantidad } },
      });
      if (descontado.count !== 1) {
        const existencia = await tx.existenciaMaterial.findUnique({
          where: {
            materialId_ubicacionId: {
              materialId: datos.materialId,
              ubicacionId: ubicacion.id,
            },
          },
          select: { cantidad: true },
        });
        throw new ConsumoOperacionError('SALDO_INSUFICIENTE', {
          cantidadDisponible: existencia?.cantidad.toString() ?? '0',
        });
      }

      const motivoMovimiento =
        datos.clasificacion === ClasificacionConsumoMaterial.PERDIDA
          ? MotivoMovimientoMaterial.MERMA_PROYECTO
          : MotivoMovimientoMaterial.CONSUMO_PROYECTO;
      const movimiento = await tx.movimientoMaterial.create({
        data: {
          claveOperacion: datos.claveOperacion,
          materialId: datos.materialId,
          cantidad: datos.cantidad,
          tipo: TipoMovimientoMaterial.SALIDA,
          motivo: motivoMovimiento,
          origenId: ubicacion.id,
          usuarioId,
          observacion: datos.motivo || null,
        },
      });
      const consumo = await tx.consumoMaterial.create({
        data: {
          claveOperacion: datos.claveOperacion,
          proyectoId: datos.proyectoId,
          materialId: datos.materialId,
          cantidad: datos.cantidad,
          clasificacion: datos.clasificacion,
          fuente: FuenteConsumoMaterial.MANUAL,
          motivo: datos.motivo || null,
          fechaJornada: datos.fechaJornada,
          actividadReferencia: datos.actividadReferencia || null,
          reporteReferencia: datos.reporteReferencia || null,
          movimientoId: movimiento.id,
          usuarioId,
        },
        include: consumoInclude,
      });
      const existencia = await tx.existenciaMaterial.findUniqueOrThrow({
        where: {
          materialId_ubicacionId: {
            materialId: datos.materialId,
            ubicacionId: ubicacion.id,
          },
        },
        select: { cantidad: true },
      });
      return { consumo, saldoActual: existencia.cantidad };
    });
  }

  async revertir(
    consumoId: number,
    claveOperacion: string,
    motivo: string,
    usuarioId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "proy_consumos_materiales"
        WHERE "id" = ${consumoId}
        FOR UPDATE
      `;
      const consumo = await tx.consumoMaterial.findUnique({
        where: { id: consumoId },
        include: { proyecto: { select: { estado: true } } },
      });
      if (!consumo) throw new ConsumoOperacionError('CONSUMO_NO_ENCONTRADO');
      if (consumo.anuladoAt) {
        if (
          consumo.claveReverso === claveOperacion &&
          consumo.motivoAnulacion === motivo
        ) {
          const repetido = await tx.consumoMaterial.findUniqueOrThrow({
            where: { id: consumoId },
            include: consumoInclude,
          });
          return { consumo: repetido, repetido: true };
        }
        if (consumo.claveReverso === claveOperacion) {
          throw new ConsumoOperacionError('CLAVE_REVERSO_DATOS_DIFERENTES');
        }
        throw new ConsumoOperacionError('CONSUMO_YA_ANULADO');
      }
      if (consumo.proyecto.estado !== 'ACTIVO')
        throw new ConsumoOperacionError('PROYECTO_NO_ACTIVO');

      const ubicacion = await tx.ubicacionMaterial.findUniqueOrThrow({
        where: { proyectoId: consumo.proyectoId },
        select: { id: true },
      });
      const movimiento = await tx.movimientoMaterial.create({
        data: {
          claveOperacion,
          materialId: consumo.materialId,
          cantidad: consumo.cantidad,
          tipo: TipoMovimientoMaterial.ENTRADA,
          motivo: MotivoMovimientoMaterial.REVERSO_CONSUMO,
          destinoId: ubicacion.id,
          usuarioId,
          observacion: motivo,
        },
      });
      await tx.existenciaMaterial.upsert({
        where: {
          materialId_ubicacionId: {
            materialId: consumo.materialId,
            ubicacionId: ubicacion.id,
          },
        },
        update: { cantidad: { increment: consumo.cantidad } },
        create: {
          materialId: consumo.materialId,
          ubicacionId: ubicacion.id,
          cantidad: consumo.cantidad,
        },
      });
      const actualizado = await tx.consumoMaterial.update({
        where: { id: consumo.id },
        data: {
          claveReverso: claveOperacion,
          movimientoReversoId: movimiento.id,
          anuladoAt: new Date(),
          anuladoPorId: usuarioId,
          motivoAnulacion: motivo,
        },
        include: consumoInclude,
      });
      return { consumo: actualizado, repetido: false };
    });
  }

  async finalizarProyecto(proyectoId: number, usuarioId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const proyecto = await tx.proyecto.findFirst({
          where: { id: proyectoId, deletedAt: null },
          include: {
            herramientas: { select: { id: true } },
            ubicacionMaterial: {
              select: {
                id: true,
                existencias: {
                  where: { cantidad: { gt: 0 } },
                  select: { id: true, materialId: true, cantidad: true },
                },
              },
            },
          },
        });
        if (!proyecto)
          throw new ConsumoOperacionError('PROYECTO_NO_ENCONTRADO');
        if (proyecto.estado !== 'ACTIVO')
          throw new ConsumoOperacionError('PROYECTO_NO_ACTIVO');
        if (proyecto.herramientas.length)
          throw new ConsumoOperacionError('HERRAMIENTAS_ASIGNADAS', {
            cantidad: proyecto.herramientas.length,
          });

        const cerrados: { materialId: number; cantidad: Prisma.Decimal }[] = [];
        for (const existencia of proyecto.ubicacionMaterial?.existencias ??
          []) {
          const claveOperacion = randomUUID();
          const movimiento = await tx.movimientoMaterial.create({
            data: {
              claveOperacion,
              materialId: existencia.materialId,
              cantidad: existencia.cantidad,
              tipo: TipoMovimientoMaterial.SALIDA,
              motivo: MotivoMovimientoMaterial.CIERRE_PROYECTO,
              origenId: proyecto.ubicacionMaterial!.id,
              usuarioId,
              observacion: 'Consumo de cierre del proyecto',
            },
          });
          await tx.consumoMaterial.create({
            data: {
              claveOperacion,
              proyectoId,
              materialId: existencia.materialId,
              cantidad: existencia.cantidad,
              clasificacion: ClasificacionConsumoMaterial.CIERRE,
              fuente: FuenteConsumoMaterial.CIERRE_PROYECTO,
              motivo: 'Saldo remanente consumido al finalizar el proyecto',
              fechaJornada: new Date(),
              movimientoId: movimiento.id,
              usuarioId,
            },
          });
          await tx.existenciaMaterial.update({
            where: { id: existencia.id },
            data: { cantidad: 0 },
          });
          cerrados.push({
            materialId: existencia.materialId,
            cantidad: existencia.cantidad,
          });
        }
        await tx.proyecto.update({
          where: { id: proyectoId },
          data: { estado: 'FINALIZADO' },
        });
        return { proyectoId, estado: 'FINALIZADO' as const, cerrados };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
