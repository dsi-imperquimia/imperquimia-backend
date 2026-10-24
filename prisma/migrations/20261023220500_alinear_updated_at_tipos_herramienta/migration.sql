-- El esquema Prisma usa @updatedAt sin un valor predeterminado en la base.
-- La migración de creación necesitó el valor para copiar los tipos existentes.
ALTER TABLE "inv_tipos_herramienta"
  ALTER COLUMN "updated_at" DROP DEFAULT;
