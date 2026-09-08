import { Material, PrismaClient } from '@gen/prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

export async function seedMateriales(prisma: PrismaClient) {
  const materiales: Omit<Material, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 1,
      nombre: 'Impermeabilizante acrílico',
      descripcion: 'Producto para techos y superficies expuestas al agua',
      unidad: 'cubeta',
      costoUnitario: new Decimal(341.59),
      estado: true,
      codigo: null,
      fichaTecnica: null,
    },
    {
      id: 2,
      nombre: 'Malla poliéster',
      descripcion: 'Refuerzo para impermeabilización',
      unidad: 'metro',
      costoUnitario: new Decimal(2.5),
      estado: true,
      codigo: null,
      fichaTecnica: null,
    },
    {
      id: 3,
      nombre: 'Sellador acrílico',
      descripcion: 'Sellador para grietas y juntas',
      unidad: 'galón',
      costoUnitario: new Decimal(18.75),
      estado: true,
      codigo: null,
      fichaTecnica: null,
    },
  ];

  const materialesCreated = [];

  for (const material of materiales) {
    materialesCreated.push(
      await prisma.material.upsert({
        where: { id: material.id },
        update: {
          updatedAt: new Date(),
        },
        create: material,
      }),
    );
  }

  /**
   * Fix secuencia
   */
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"mnt_materiales"', 'id'),
      COALESCE(MAX(id), 0) + 1, 
      false
    ) FROM "mnt_materiales";
  `);

  console.log(`Seeded ${materialesCreated.length} materiales.`);
  console.table(materialesCreated, ['id', 'nombre']);
}
