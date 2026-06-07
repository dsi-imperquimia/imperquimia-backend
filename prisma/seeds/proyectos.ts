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

  console.log(`Seeded ${proyectosCreados.length} proyectos.`);
  console.table(proyectosCreados, ['id', 'nombre', 'ubicacion', 'estado']);
}
