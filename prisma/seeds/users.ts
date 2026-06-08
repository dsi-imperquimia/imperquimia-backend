import { User } from '@gen/prisma/browser';
import { PrismaClient } from '@gen/prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedUsers(prisma: PrismaClient) {
  // const password = await bcrypt.hash('123456', 12);

  const users: Omit<User, 'createdAt' | 'updatedAt' | 'deletedAt'>[] = [
    {
      id: 1,
      name: 'Admin',
      lastName: 'System',
      email: 'admin@imperquimia.com',
      roleId: 1,
      password: await bcrypt.hash('123456', 12),
    },
  ];

  const userCreated = [];

  for (const user of users) {
    userCreated.push(
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          updatedAt: new Date(),
        },
        create: user,
      }),
    );
  }

  /**
   * Fix secuencia
   */
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"mnt_users"', 'id'),
      COALESCE(MAX(id), 0) + 1, 
      false
    ) FROM "mnt_roles";
  `);

  console.log(`Seeded ${userCreated.length} users.`);
  console.table(userCreated, ['id', 'name', 'lastName', 'email']);
}
