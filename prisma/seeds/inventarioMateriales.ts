import { PrismaClient } from '@gen/prisma/client';

// Bodega general: ubicación por defecto donde entra todo material nuevo
// (GPRCIMPER-94/95). El código de la aplicación la busca por este `codigo`.
export async function seedInventarioMateriales(prisma: PrismaClient) {
  const bodega = await prisma.ubicacionMaterial.upsert({
    where: { codigo: 'BODEGA-GENERAL' },
    update: {},
    create: {
      codigo: 'BODEGA-GENERAL',
      nombre: 'Bodega general',
      tipo: 'BODEGA',
    },
  });

  const materiales = await prisma.material.findMany({ select: { id: true } });
  await prisma.existenciaMaterial.createMany({
    data: materiales.map(({ id }) => ({
      materialId: id,
      ubicacionId: bodega.id,
      cantidad: 0,
    })),
    skipDuplicates: true,
  });

  console.log(
    `Seeded bodega general y ${materiales.length} existencia(s) en cero.`,
  );
}
