import 'dotenv/config';

import { env } from '@/config/env.config';
import { PrismaClient } from '@gen/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedInventarioMateriales } from './inventarioMateriales';
import { seedRoles } from './roolesSeed';
import { seedUbicacionesHerramientas } from './ubicacionesHerramientas';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

async function main() {
  await seedRoles(prisma);
  await seedInventarioMateriales(prisma);
  await seedUbicacionesHerramientas(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
