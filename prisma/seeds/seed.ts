import 'dotenv/config';

import { env } from '@/config/env.config';
import { PrismaClient } from '@gen/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedUsers } from './users';
import { seedProyectos } from './proyectos';


const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

async function main() {
  await seedUsers(prisma);
  await seedProyectos(prisma);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
