import { Prisma, PrismaClient } from '@gen/prisma/client';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// DMMF from @gen/prisma/client is a type-only export — no runtime value.
// Parse schema.prisma at module load instead.
function buildSoftDeleteModelSet(): Set<string> {
  try {
    const schema = readFileSync(
      join(process.cwd(), 'prisma/schema.prisma'),
      'utf-8',
    );
    const set = new Set<string>();
    const modelRegex = /^model\s+(\w+)\s*\{([^}]*)}/gm;
    let match: RegExpExecArray | null;
    while ((match = modelRegex.exec(schema)) !== null) {
      if (/\bdeletedAt\b/.test(match[2])) {
        set.add(match[1]);
      }
    }
    return set;
  } catch {
    return new Set();
  }
}

const softDeleteModels = buildSoftDeleteModelSet();

console.log(
  `Soft delete enabled for models: ${[...softDeleteModels].join(', ')}`,
);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize PrismaService');
    }

    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  public readonly extendedClient = this.$extends({
    name: 'softDelete',
    model: {
      $allModels: {
        // delete/deleteMany must be intercepted here — in query extensions `this` is NOT
        // the model delegate and has no CRUD methods. Models without deletedAt get a
        // Prisma validation error; use the base PrismaService for those.
        // eslint-disable-next-line @typescript-eslint/require-await
        async delete<T, A>(
          this: T,
          args: Prisma.Exact<A, Prisma.Args<T, 'delete'>>,
        ) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const ctx = Prisma.getExtensionContext(this) as any;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          return ctx.update({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            where: (args as any).where,
            data: { deletedAt: new Date() },
          });
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        async deleteMany<T, A>(
          this: T,
          args?: Prisma.Exact<A, Prisma.Args<T, 'deleteMany'>>,
        ) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const ctx = Prisma.getExtensionContext(this) as any;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          return ctx.updateMany({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            where: (args as any)?.where,
            data: { deletedAt: new Date() },
          });
        },
      },
    },
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            softDeleteModels.has(model) &&
            (operation === 'findUnique' ||
              operation === 'findFirst' ||
              operation === 'findMany')
          ) {
            return query({
              ...args,
              where: {
                ...(args as { where?: object }).where,
                deletedAt: null,
              },
            });
          }
          return query(args);
        },
      },
    },
  });

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
