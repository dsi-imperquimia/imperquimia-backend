import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmpleadoRepository } from '../src/empleados/repository/empleadoRepository';
import { EmpleadoService } from '../src/empleados/service/empleado.service';

// Opt-in: usa PostgreSQL configurado en .env y revierte todos los registros de prueba.
// PowerShell: $env:RUN_EMPLEADOS_DB_TESTS='1'
// node --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-e2e.json --runTestsByPath test/empleados-habilidades.e2e-spec.ts --runInBand
const describeDatabase =
  process.env.RUN_EMPLEADOS_DB_TESTS === '1' ? describe : describe.skip;

describeDatabase('Habilidades de empleados: persistencia en PostgreSQL', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('crea, reemplaza y quita habilidades sin afectar a otros empleados ni perder auditoría', async () => {
    const rollback = new Error('ROLLBACK_FIXTURE');
    const suffix = randomUUID();
    let empleadoId: number | undefined;
    try {
      await prisma.models.$transaction(
        async (tx) => {
          // Todas las operaciones del repositorio participan de esta transacción
          // externa, que siempre termina en rollback (incluso si falla una aserción).
          const fixtureClient = {
            models: {
              empleado: tx.empleado,
              $transaction: async <T>(
                work: (client: typeof tx) => Promise<T>,
              ) => work(tx),
            },
          } as unknown as PrismaService;
          const repo = new EmpleadoRepository(fixtureClient);
          const service = new EmpleadoService(repo);
          const cargo = await tx.cargo.create({
            data: { nombre: `test-cargo-${suffix}` },
          });
          const habilidades = await Promise.all(
            [1, 2, 3].map((i) =>
              tx.habilidad.create({
                data: { nombre: `test-habilidad-${i}-${suffix}` },
              }),
            ),
          );
          const [primera, segunda, tercera] = habilidades;
          const base = {
            nombreCompleto: 'Empleado de prueba',
            dui: `test-dui-${suffix}`,
            nit: `test-nit-${suffix}`,
            cargoId: cargo.id,
            activo: true,
          };
          const creado = await service.create({
            ...base,
            habilidadesIds: [primera.id, segunda.id],
          });
          empleadoId = creado.id;
          const otro = await service.create({
            ...base,
            dui: `test-dui-otro-${suffix}`,
            nit: `test-nit-otro-${suffix}`,
            habilidadesIds: [primera.id],
          });
          const inicial = await repo.findUnique(creado.id);
          expect(inicial?.habilidades.map((h) => h.habilidadId).sort()).toEqual(
            [primera.id, segunda.id].sort(),
          );
          expect(inicial?.cargo?.id).toBe(cargo.id);

          const fechaOriginal = new Date('2020-01-01T00:00:00Z');
          await tx.habilidadEmpleado.update({
            where: {
              empleadoId_habilidadId: {
                empleadoId: creado.id,
                habilidadId: segunda.id,
              },
            },
            data: {
              assignedAt: fechaOriginal,
              assignedBy: 'Auditoría de prueba',
            },
          });
          await service.update(creado.id, {
            nombreCompleto: 'Empleado actualizado',
            habilidadesIds: [segunda.id, tercera.id],
          });
          const actualizado = await repo.findUnique(creado.id);
          expect(actualizado?.nombreCompleto).toBe('Empleado actualizado');
          expect(
            actualizado?.habilidades.map((h) => h.habilidadId).sort(),
          ).toEqual([segunda.id, tercera.id].sort());
          expect(
            actualizado?.habilidades.find((h) => h.habilidadId === segunda.id),
          ).toMatchObject({
            assignedAt: fechaOriginal,
            assignedBy: 'Auditoría de prueba',
          });
          expect(
            (await repo.findUnique(otro.id))?.habilidades.map(
              (h) => h.habilidadId,
            ),
          ).toEqual([primera.id]);

          await service.update(creado.id, { activo: false });
          expect((await repo.findUnique(creado.id))?.habilidades).toHaveLength(
            2,
          );

          const eliminado = await tx.habilidad.create({
            data: { nombre: `test-eliminada-${suffix}` },
          });
          await tx.habilidad.delete({ where: { id: eliminado.id } });
          await expect(
            service.update(creado.id, {
              nombreCompleto: 'No debe guardarse',
              habilidadesIds: [eliminado.id],
            }),
          ).rejects.toMatchObject({ status: 400 });
          expect(await repo.findUnique(creado.id)).toMatchObject({
            nombreCompleto: 'Empleado actualizado',
            habilidades: expect.any(Array),
          });
          expect((await repo.findUnique(creado.id))?.habilidades).toHaveLength(
            2,
          );

          await service.updateHabilidades(creado.id, []);
          expect((await repo.findUnique(creado.id))?.habilidades).toHaveLength(
            0,
          );
          await service.updateHabilidades(creado.id, [primera.id]);
          expect(
            (await repo.findUnique(creado.id))?.habilidades.map(
              (h) => h.habilidad.nombre,
            ),
          ).toEqual([primera.nombre]);

          await tx.empleado.update({
            where: { id: creado.id },
            data: { deletedAt: new Date() },
          });
          await expect(
            service.updateHabilidades(creado.id, []),
          ).rejects.toMatchObject({ status: 404 });
          throw rollback;
        },
        { timeout: 30000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(empleadoId).toBeDefined();
    expect(
      await prisma.empleado.findUnique({ where: { id: empleadoId } }),
    ).toBeNull();
  }, 35000);
});
