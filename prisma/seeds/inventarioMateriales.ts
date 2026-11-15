import { PrismaClient, TipoUbicacionMaterial } from '@gen/prisma/client';

const CODIGO_BODEGA = 'BODEGA-GENERAL';
const LOTE_MATERIALES = 500;

// Bodega general: ubicación por defecto donde entra todo material nuevo
// (GPRCIMPER-94/95). El código de la aplicación la busca por este `codigo`.
// Único punto del sistema que crea una ubicación tipo BODEGA: no hay
// endpoint para crear ubicaciones arbitrarias (solo esta bodega y, dentro
// del repositorio de inventario, las de tipo PROYECTO por cada proyecto),
// así que "solo puede existir una bodega" se cumple por construcción sin
// necesitar el índice único parcial que tenía la migración.
export async function seedInventarioMateriales(prisma: PrismaClient) {
  const creadas = await prisma.$transaction(async (tx) => {
    const bodega = await tx.ubicacionMaterial.upsert({
      where: { codigo: CODIGO_BODEGA },
      update: {},
      create: {
        codigo: CODIGO_BODEGA,
        nombre: 'Bodega general',
        tipo: TipoUbicacionMaterial.BODEGA,
      },
    });

    if (bodega.tipo !== TipoUbicacionMaterial.BODEGA || bodega.proyectoId !== null) {
      throw new Error(`${CODIGO_BODEGA} existe, pero no es una bodega general.`);
    }

    const materiales = await tx.material.findMany({ select: { id: true } });
    let total = 0;
    for (let inicio = 0; inicio < materiales.length; inicio += LOTE_MATERIALES) {
      const lote = materiales.slice(inicio, inicio + LOTE_MATERIALES);
      const resultado = await tx.existenciaMaterial.createMany({
        data: lote.map(({ id }) => ({
          materialId: id,
          ubicacionId: bodega.id,
          cantidad: 0,
        })),
        skipDuplicates: true,
      });
      total += resultado.count;
    }
    return total;
  });

  console.log(`Bodega general lista; ${creadas} existencias iniciales creadas.`);
}
