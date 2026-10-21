import 'dotenv/config';

import { env } from '@/config/env.config';
import { PrismaClient } from '@gen/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { fixSequences } from './fix-sequences';
import { seedMateriales } from './materiales';
import { seedProyectos } from './proyectos';
import { seedRoles } from './roolesSeed';
import { seedUsers } from './users';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

async function main() {
  await seedRoles(prisma);
  await seedUsers(prisma);
  await seedMateriales(prisma);
  await seedProyectos(prisma);
  await fixSequences(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
