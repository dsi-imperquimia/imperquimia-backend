import { PrismaClient } from '@gen/prisma/client';

type SequenceFix = {
  tableName: string;
  columnName: string;
  statement: string;
};

/**
 * Repara las secuencias de todas las columnas autoincrementales (serial o
 * identity) del esquema public, dejando cada una en MAX(columna) + 1.
 * Necesario cuando se insertan registros con id explícito (seeds, imports).
 */
export async function fixSequences(prisma: PrismaClient) {
  const fixes = await prisma.$queryRaw<SequenceFix[]>`
    SELECT
      c.table_name AS "tableName",
      c.column_name AS "columnName",
      format(
        'SELECT setval(%L, COALESCE(MAX(%I), 0) + 1, false) FROM %I.%I',
        pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name),
        c.column_name,
        c.table_schema,
        c.table_name
      ) AS statement
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) IS NOT NULL
    ORDER BY c.table_name, c.column_name
  `;

  for (const fix of fixes) {
    await prisma.$executeRawUnsafe(fix.statement);
  }

  console.log(`Fixed ${fixes.length} sequences.`);
  console.table(fixes, ['tableName', 'columnName']);
}
