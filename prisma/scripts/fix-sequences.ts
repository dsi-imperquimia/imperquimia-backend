import 'dotenv/config';

import { env } from '@/config/env.config';
import { PrismaClient } from '@gen/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { fixSequences } from '../seeds/fix-sequences';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

fixSequences(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
