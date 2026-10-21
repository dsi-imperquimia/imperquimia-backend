CREATE TABLE "mnt_marcas_herramientas" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "clave" TEXT NOT NULL UNIQUE,
  "activo" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "mnt_marcas_herramientas" ("nombre", "clave")
SELECT MIN(COALESCE(NULLIF(TRIM("marca"), ''), 'Sin especificar')),
       LOWER(COALESCE(NULLIF(TRIM("marca"), ''), 'Sin especificar'))
FROM "inv_herramientas"
GROUP BY LOWER(COALESCE(NULLIF(TRIM("marca"), ''), 'Sin especificar'));
ALTER TABLE "inv_herramientas" ADD COLUMN "marca_id" INTEGER;
UPDATE "inv_herramientas" h SET "marca_id" = m."id", "marca" = m."nombre"
FROM "mnt_marcas_herramientas" m
WHERE m."clave" = LOWER(COALESCE(NULLIF(TRIM(h."marca"), ''), 'Sin especificar'));
ALTER TABLE "inv_herramientas" ALTER COLUMN "marca_id" SET NOT NULL;
ALTER TABLE "inv_herramientas" ADD CONSTRAINT "inv_herramientas_marca_id_fkey"
FOREIGN KEY ("marca_id") REFERENCES "mnt_marcas_herramientas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
