import { randomUUID } from 'node:crypto';
import {
  ClasificacionConsumoMaterial,
  MotivoMovimientoMaterial,
} from '@gen/prisma/client';
import { ConsumosMaterialesRepository } from '../src/consumos-materiales/repository/consumos-materiales.repository';
import { ConsumosMaterialesService } from '../src/consumos-materiales/service/consumos-materiales.service';
import { PdfConsumosService } from '../src/consumos-materiales/service/pdf-consumos.service';
import { InventarioMaterialesRepository } from '../src/inventario-materiales/repository/inventario-materiales.repository';
import { InventarioMaterialesService } from '../src/inventario-materiales/service/inventario-materiales.service';
import { PrismaService } from '../src/prisma/prisma.service';

const db = process.env.RUN_CONSUMOS_DB_TESTS === '1' ? describe : describe.skip;

db('Consumos de materiales: integración PostgreSQL', () => {
  let prisma: PrismaService;
  let inventario: InventarioMaterialesService;
  let consumos: ConsumosMaterialesService;
  let userId: number | undefined;
  let materialId: number | undefined;
  let proyectoId: number | undefined;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    inventario = new InventarioMaterialesService(
      new InventarioMaterialesRepository(prisma),
    );
    consumos = new ConsumosMaterialesService(
      new ConsumosMaterialesRepository(prisma),
      new PdfConsumosService(),
    );
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: 'Prueba',
        lastName: 'Consumos',
        email: `${suffix}@consumos.test`,
        password: 'no-login',
        roleId: 1,
      },
    });
    userId = user.id;
    const material = await prisma.material.create({
      data: {
        nombre: `Material consumo ${suffix}`,
        codigo: `CON-${suffix}`,
        unidad: 'unidad',
        costoUnitario: 1,
      },
    });
    materialId = material.id;
    const proyecto = await prisma.proyecto.create({
      data: { nombre: `Proyecto consumo ${suffix}`, creadoPorId: user.id },
    });
    proyectoId = proyecto.id;
  });

  afterAll(async () => {
    if (proyectoId) {
      await prisma.desviacionConsumo.deleteMany({ where: { proyectoId } });
      await prisma.consumoMaterial.deleteMany({ where: { proyectoId } });
    }
    if (materialId) {
      await prisma.movimientoMaterial.deleteMany({ where: { materialId } });
      await prisma.existenciaMaterial.deleteMany({ where: { materialId } });
    }
    if (proyectoId) {
      await prisma.ubicacionMaterial.deleteMany({ where: { proyectoId } });
      await prisma.proyecto.delete({ where: { id: proyectoId } });
    }
    if (materialId) await prisma.material.delete({ where: { id: materialId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('rechaza el acceso de un usuario sin empleado ni asignación al proyecto', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Sin',
        lastName: 'Asignación',
        email: `${randomUUID()}@consumos.test`,
        password: 'no-login',
      },
    });
    try {
      await expect(
        consumos.findProyecto(proyectoId!, user.id),
      ).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        consumos.findProyecto(proyectoId!, userId!),
      ).resolves.toHaveProperty('proyecto.id', proyectoId);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it('conserva consumo acumulado, valida devoluciones y revierte una vez', async () => {
    await inventario.registrarEntrada(
      {
        claveOperacion: randomUUID(),
        materialId: materialId!,
        cantidad: 10,
        motivo: MotivoMovimientoMaterial.COMPRA,
      },
      userId!,
    );
    await inventario.registrarSalida(
      {
        claveOperacion: randomUUID(),
        materialId: materialId!,
        cantidad: 4,
        motivo: MotivoMovimientoMaterial.USO_PROYECTO,
        proyectoId,
      },
      userId!,
    );
    await consumos.registrar(
      {
        claveOperacion: randomUUID(),
        proyectoId: proyectoId!,
        materialId: materialId!,
        cantidad: 2,
        clasificacion: ClasificacionConsumoMaterial.PRODUCCION,
        fechaJornada: '2026-11-11',
      },
      userId!,
    );
    await inventario.registrarEntrada(
      {
        claveOperacion: randomUUID(),
        materialId: materialId!,
        cantidad: 2,
        motivo: MotivoMovimientoMaterial.DEVOLUCION_PROYECTO,
        proyectoId,
      },
      userId!,
    );
    await inventario.registrarSalida(
      {
        claveOperacion: randomUUID(),
        materialId: materialId!,
        cantidad: 4,
        motivo: MotivoMovimientoMaterial.USO_PROYECTO,
        proyectoId,
      },
      userId!,
    );
    await consumos.registrar(
      {
        claveOperacion: randomUUID(),
        proyectoId: proyectoId!,
        materialId: materialId!,
        cantidad: 4,
        clasificacion: ClasificacionConsumoMaterial.PRODUCCION,
        fechaJornada: '2026-11-12',
      },
      userId!,
    );

    const resumen = await consumos.findProyecto(proyectoId!, userId!);
    expect(resumen.resumen[0]).toMatchObject({
      entregado: '8',
      devuelto: '2',
      consumido: '6',
      existenciaActual: '0',
    });
    await expect(
      inventario.registrarEntrada(
        {
          claveOperacion: randomUUID(),
          materialId: materialId!,
          cantidad: 6,
          motivo: MotivoMovimientoMaterial.DEVOLUCION_PROYECTO,
          proyectoId,
        },
        userId!,
      ),
    ).rejects.toThrow('Actualmente hay 0 unidades disponibles');

    await inventario.registrarSalida(
      {
        claveOperacion: randomUUID(),
        materialId: materialId!,
        cantidad: 1,
        motivo: MotivoMovimientoMaterial.USO_PROYECTO,
        proyectoId,
      },
      userId!,
    );
    const merma = await consumos.registrar(
      {
        claveOperacion: randomUUID(),
        proyectoId: proyectoId!,
        materialId: materialId!,
        cantidad: 1,
        clasificacion: ClasificacionConsumoMaterial.PERDIDA,
        fechaJornada: '2026-11-12',
        motivo: 'Material endurecido',
      },
      userId!,
    );
    const claveReverso = randomUUID();
    const reverso = await consumos.revertir(
      merma.consumo.id,
      { claveOperacion: claveReverso, motivo: 'Registro duplicado' },
      userId!,
    );
    expect(reverso.repetido).toBe(false);
    const repetido = await consumos.revertir(
      merma.consumo.id,
      { claveOperacion: claveReverso, motivo: 'Registro duplicado' },
      userId!,
    );
    expect(repetido.repetido).toBe(true);
    await expect(
      consumos.revertir(
        merma.consumo.id,
        { claveOperacion: randomUUID(), motivo: 'Otra corrección' },
        userId!,
      ),
    ).rejects.toThrow('Este consumo ya fue corregido.');

    const clientesConcurrentes = [new PrismaService(), new PrismaService()];
    await Promise.all(clientesConcurrentes.map((client) => client.$connect()));
    let resultados: PromiseSettledResult<unknown>[];
    let resultadosReverso: PromiseSettledResult<unknown>[] = [];
    try {
      const serviciosConcurrentes = clientesConcurrentes.map(
        (client) =>
          new ConsumosMaterialesService(
            new ConsumosMaterialesRepository(client),
            new PdfConsumosService(),
          ),
      );
      resultados = await Promise.allSettled(
        serviciosConcurrentes.map((service) =>
          service.registrar(
            {
              claveOperacion: randomUUID(),
              proyectoId: proyectoId!,
              materialId: materialId!,
              cantidad: 1,
              clasificacion: ClasificacionConsumoMaterial.PRODUCCION,
              fechaJornada: '2026-11-12',
            },
            userId!,
          ),
        ),
      );
      const aplicado = resultados.find(
        (
          result,
        ): result is PromiseFulfilledResult<{
          consumo: { id: number };
        }> => result.status === 'fulfilled',
      );
      expect(aplicado).toBeDefined();
      resultadosReverso = await Promise.allSettled(
        serviciosConcurrentes.map((service, index) =>
          service.revertir(
            aplicado!.value.consumo.id,
            {
              claveOperacion: randomUUID(),
              motivo: `Corrección concurrente ${index + 1}`,
            },
            userId!,
          ),
        ),
      );
    } finally {
      await Promise.all(
        clientesConcurrentes.map((client) => client.$disconnect()),
      );
    }
    expect(
      resultados.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      resultados.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(
      resultadosReverso.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      resultadosReverso.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const saldoFinal = await consumos.findProyecto(proyectoId!, userId!);
    expect(saldoFinal.resumen[0].existenciaActual).toBe('1');

    const desviaciones = await consumos.findDesviaciones(proyectoId!, userId!);
    expect(desviaciones.length).toBeGreaterThan(0);
    const pdf = await consumos.generarReportePdf(proyectoId!, {}, userId!);
    expect(pdf.buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('envía varios materiales de forma atómica al proyecto', async () => {
    const suffix = randomUUID();
    const materiales = await Promise.all(
      ['A', 'B'].map((nombre) =>
        prisma.material.create({
          data: {
            nombre: `Material lote ${nombre} ${suffix}`,
            codigo: `LOTE-${nombre}-${suffix}`,
            unidad: 'unidad',
            costoUnitario: 1,
          },
        }),
      ),
    );
    try {
      for (const material of materiales) {
        await inventario.registrarEntrada(
          {
            claveOperacion: randomUUID(),
            materialId: material.id,
            cantidad: 5,
            motivo: MotivoMovimientoMaterial.COMPRA,
          },
          userId!,
        );
      }

      const envio = await inventario.registrarSalidasProyecto(
        {
          proyectoId: proyectoId!,
          materiales: [
            {
              claveOperacion: randomUUID(),
              materialId: materiales[0].id,
              cantidad: 2,
            },
            {
              claveOperacion: randomUUID(),
              materialId: materiales[1].id,
              cantidad: 3,
            },
          ],
          observacion: 'Envío múltiple de prueba',
        },
        userId!,
      );
      expect(envio.movimientos).toHaveLength(2);

      const antesDelFallo = await inventario.findExistencias();
      const bodegaAntes = antesDelFallo.find(
        (item) =>
          item.materialId === materiales[0].id &&
          item.ubicacion.tipo === 'BODEGA',
      )!;
      await expect(
        inventario.registrarSalidasProyecto(
          {
            proyectoId: proyectoId!,
            materiales: [
              {
                claveOperacion: randomUUID(),
                materialId: materiales[0].id,
                cantidad: 1,
              },
              {
                claveOperacion: randomUUID(),
                materialId: materiales[1].id,
                cantidad: 99,
              },
            ],
          },
          userId!,
        ),
      ).rejects.toThrow('saldo disponible');
      const despuesDelFallo = await inventario.findExistencias();
      const bodegaDespues = despuesDelFallo.find(
        (item) =>
          item.materialId === materiales[0].id &&
          item.ubicacion.tipo === 'BODEGA',
      )!;
      expect(bodegaDespues.cantidad.toString()).toBe(
        bodegaAntes.cantidad.toString(),
      );
    } finally {
      const ids = materiales.map((material) => material.id);
      await prisma.movimientoMaterial.deleteMany({
        where: { materialId: { in: ids } },
      });
      await prisma.existenciaMaterial.deleteMany({
        where: { materialId: { in: ids } },
      });
      await prisma.material.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it('finaliza el proyecto conservando sus técnicos en el historial', async () => {
    const suffix = randomUUID();
    const cargo = await prisma.cargo.create({
      data: { nombre: `Cargo cierre ${suffix}` },
    });
    const empleado = await prisma.empleado.create({
      data: {
        nombreCompleto: 'Técnico de cierre',
        dui: `DUI-${suffix}`,
        nit: `NIT-${suffix}`,
        cargoId: cargo.id,
      },
    });
    const proyecto = await prisma.proyecto.create({
      data: {
        nombre: `Proyecto cierre ${suffix}`,
        creadoPorId: userId!,
        empleados: { create: { empleadoId: empleado.id } },
      },
    });

    try {
      await expect(
        consumos.finalizarProyecto(proyecto.id, userId!),
      ).resolves.toMatchObject({ estado: 'FINALIZADO' });
      await expect(
        prisma.proyectoEmpleado.findUniqueOrThrow({
          where: {
            proyectoId_empleadoId: {
              proyectoId: proyecto.id,
              empleadoId: empleado.id,
            },
          },
        }),
      ).resolves.toMatchObject({ fechaRetiro: null });
    } finally {
      await prisma.proyectoEmpleado.deleteMany({
        where: { proyectoId: proyecto.id },
      });
      await prisma.proyecto.delete({ where: { id: proyecto.id } });
      await prisma.empleado.delete({ where: { id: empleado.id } });
      await prisma.cargo.delete({ where: { id: cargo.id } });
    }
  });
});
