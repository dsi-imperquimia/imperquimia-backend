import { PrismaClient } from '@gen/prisma/client';

export async function seedProyectos(prisma: PrismaClient) {
  const proyectos = [
    {
      id: 1,
      nombre: 'Residencial Los Pinos',
      ubicacion: 'Santa Tecla, La Libertad',
      estado: 'ACTIVO' as const,
    },
    {
      id: 2,
      nombre: 'Edificio Comercial Centro',
      ubicacion: 'San Salvador, Centro Histórico',
      estado: 'ACTIVO' as const,
    },
    {
      id: 3,
      nombre: 'Bodega Industrial Norte',
      ubicacion: 'Apopa, San Salvador',
      estado: 'ACTIVO' as const,
    },
    // --- 5 NUEVOS PROYECTOS (EDIFICIOS EN CONSTRUCCIÓN EN EL SALVADOR) ---
    {
      id: 4,
      nombre: 'Torre Millennium Plaza (Fase II)',
      ubicacion: 'Paseo General Escalón, San Salvador',
      estado: 'ACTIVO' as const,
    },
    {
      id: 5,
      nombre: 'Condominio Alturas de Holanda',
      ubicacion: 'Colonia Escalón Alto, San Salvador',
      estado: 'ACTIVO' as const,
    },
    {
      id: 6,
      nombre: 'Complejo Residencial Humana',
      ubicacion: 'Colonia San Benito, San Salvador',
      estado: 'ACTIVO' as const,
    },
    {
      id: 7,
      nombre: 'Torres Districto El Espino',
      ubicacion: 'Antiguo Cuscatlán, La Libertad',
      estado: 'ACTIVO' as const,
    },
    {
      id: 8,
      nombre: 'Skyline Nuevo Cuscatlán',
      ubicacion: 'Nuevo Cuscatlán, La Libertad',
      estado: 'ACTIVO' as const,
    },
  ];

  const proyectosCreados = [];

  for (const proyecto of proyectos) {
    proyectosCreados.push(
      await prisma.proyecto.upsert({
        where: { id: proyecto.id },
        update: { updatedAt: new Date() },
        create: proyecto,
      }),
    );
  }

  /**
   * Fix secuencia
   */
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"proy_proyectos"', 'id'),
      COALESCE(MAX(id), 0) + 1, 
      false
    ) FROM "proy_proyectos";
  `);

  console.log(`Seeded ${proyectosCreados.length} proyectos.`);
  console.table(proyectosCreados, ['id', 'nombre', 'ubicacion', 'estado']);
}
