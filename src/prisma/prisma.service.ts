import { env } from '@/config/env.config';
import { Prisma, PrismaClient } from '@gen/prisma/client';
import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
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

interface SoftDeleteContext<T, A> {
  update(args: {
    where: unknown;
    data: { deletedAt: Date };
  }): Promise<Prisma.Result<T, A, 'delete'>>;

  updateMany(args: {
    where?: unknown;
    data: { deletedAt: Date };
  }): Promise<Prisma.BatchPayload>;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    });
  }

  public readonly models = this.$extends({
    name: 'softDelete',
    model: {
      $allModels: {
        // delete/deleteMany must be intercepted here — in query extensions `this` is NOT
        // the model delegate and has no CRUD methods. Models without deletedAt get a
        // Prisma validation error; use the base PrismaService for those.
        async delete<T, A>(
          this: T,
          args: Prisma.Exact<A, Prisma.Args<T, 'delete'>>,
        ): Promise<Prisma.Result<T, A, 'delete'>> {
          const ctx = Prisma.getExtensionContext(
            this,
          ) as unknown as SoftDeleteContext<T, A>;

          const safeArgs = args as { where: unknown };

          return ctx.update({
            where: safeArgs.where,
            data: { deletedAt: new Date() },
          });
        },
        async deleteMany<T, A>(
          this: T,
          args?: Prisma.Exact<A, Prisma.Args<T, 'deleteMany'>>,
        ): Promise<Prisma.BatchPayload> {
          const ctx = Prisma.getExtensionContext(
            this,
          ) as unknown as SoftDeleteContext<T, A>;
          const safeArgs = args as { where?: unknown } | undefined;

          return ctx.updateMany({
            where: safeArgs?.where,
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
