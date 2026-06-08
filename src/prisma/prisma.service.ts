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

type BaseDelegate = {
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<Prisma.BatchPayload>;
};

const SOFT_DELETE_FINDS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
]);

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
    query: {
      $allModels: {
        // Arrow function captures `this` (the unextended PrismaService).
        // Calling this[delegate].update/updateMany bypasses the extension
        // proxy entirely — no recursion possible.
        $allOperations: async ({ model, operation, args, query }) => {
          if (!softDeleteModels.has(model)) {
            return query(args);
          }

          if (SOFT_DELETE_FINDS.has(operation)) {
            return query({
              ...args,
              where: {
                ...(args as { where?: object }).where,
                deletedAt: null,
              },
            });
          }

          if (operation === 'delete' || operation === 'deleteMany') {
            const delegateKey = model.charAt(0).toLowerCase() + model.slice(1);
            const delegate = (this as unknown as Record<string, BaseDelegate>)[
              delegateKey
            ];

            if (operation === 'delete') {
              return delegate.update({
                where: (args as { where: unknown }).where,
                data: { deletedAt: new Date() },
              });
            }
            return delegate.updateMany({
              where: (args as { where?: unknown }).where,
              data: { deletedAt: new Date() },
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
