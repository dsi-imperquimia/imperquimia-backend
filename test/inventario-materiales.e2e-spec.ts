import { randomUUID } from 'node:crypto';
import { MotivoMovimientoMaterial } from '@gen/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { InventarioMaterialesRepository } from '../src/inventario-materiales/repository/inventario-materiales.repository';
import { InventarioMaterialesService } from '../src/inventario-materiales/service/inventario-materiales.service';

const db =
  process.env.RUN_INVENTARIO_DB_TESTS === '1' ? describe : describe.skip;

db('Inventario de materiales: integración PostgreSQL', () => {
  let prisma: PrismaService;
  let service: InventarioMaterialesService;
  let userId: number | undefined;
  let materialId: number | undefined;
  let proyectoId: number | undefined;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new InventarioMaterialesService(
      new InventarioMaterialesRepository(prisma),
    );

    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: 'Prueba',
        lastName: 'Inventario',
        email: `${suffix}@inventario.test`,
        password: 'no-login',
      },
    });
    userId = user.id;
    const material = await prisma.material.create({
      data: {
        nombre: `Material inventario ${suffix}`,
        codigo: `TEST-${suffix}`,
        unidad: 'unidad',
        costoUnitario: 1,
      },
    });
    materialId = material.id;
    const proyecto = await prisma.proyecto.create({
      data: { nombre: `Proyecto inventario ${suffix}`, creadoPorId: user.id },
    });
    proyectoId = proyecto.id;
  });

  afterAll(async () => {
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

  it('evita doble aplicación y saldo negativo bajo salidas concurrentes', async () => {
    const claveEntrada = randomUUID();
    const entrada = {
      claveOperacion: claveEntrada,
      materialId: materialId!,
      cantidad: 100,
      motivo: MotivoMovimientoMaterial.COMPRA,
    };

    await service.registrarEntrada(entrada, userId!);
    const repetida = await service.registrarEntrada(entrada, userId!);
    expect(repetida.repetido).toBe(true);

    const clientesConcurrentes = [new PrismaService(), new PrismaService()];
    const clavesSalidas = [randomUUID(), randomUUID()];
    await Promise.all(clientesConcurrentes.map((client) => client.$connect()));
    let salidas: PromiseSettledResult<unknown>[];
    try {
      salidas = await Promise.allSettled(
        clientesConcurrentes.map((client, index) =>
          new InventarioMaterialesService(
            new InventarioMaterialesRepository(client),
          ).registrarSalida(
            {
              claveOperacion: clavesSalidas[index],
              materialId: materialId!,
              cantidad: 60,
              motivo: MotivoMovimientoMaterial.USO_PROYECTO,
              proyectoId,
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
      salidas.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      salidas.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);

    const existencias = await service.findExistencias(materialId);
    const bodega = existencias.find((item) => item.ubicacion.tipo === 'BODEGA');
    const proyecto = existencias.find(
      (item) => item.ubicacion.proyectoId === proyectoId,
    );
    expect(bodega?.cantidad.toString()).toBe('40');
    expect(proyecto?.cantidad.toString()).toBe('60');
    expect(
      await prisma.movimientoMaterial.count({ where: { materialId } }),
    ).toBe(2);

    await prisma.proyecto.update({
      where: { id: proyectoId },
      data: { estado: 'FINALIZADO' },
    });
    await expect(
      service.registrarSalida(
        {
          claveOperacion: randomUUID(),
          materialId: materialId!,
          cantidad: 1,
          motivo: MotivoMovimientoMaterial.USO_PROYECTO,
          proyectoId,
        },
        userId!,
      ),
    ).rejects.toThrow(
      'Solo se pueden registrar movimientos de materiales en proyectos activos.',
    );

    await expect(
      service.registrarEntrada(
        {
          claveOperacion: randomUUID(),
          materialId: materialId!,
          cantidad: 60,
          motivo: MotivoMovimientoMaterial.DEVOLUCION_PROYECTO,
          proyectoId,
        },
        userId!,
      ),
    ).rejects.toThrow(
      'Solo se pueden registrar movimientos de materiales en proyectos activos.',
    );
    const saldosFinales = await service.findExistencias(materialId);
    expect(
      saldosFinales
        .find((item) => item.ubicacion.tipo === 'BODEGA')
        ?.cantidad.toString(),
    ).toBe('40');
    expect(
      saldosFinales
        .find((item) => item.ubicacion.proyectoId === proyectoId)
        ?.cantidad.toString(),
    ).toBe('60');
  });
});
