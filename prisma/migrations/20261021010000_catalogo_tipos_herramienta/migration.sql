CREATE TABLE "inv_tipos_herramienta" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inv_tipos_herramienta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inv_tipos_herramienta_nombre_key" ON "inv_tipos_herramienta"("nombre");
-- Conservar cada valor previo, incluso cuando difiere solo en mayúsculas.
INSERT INTO "inv_tipos_herramienta" ("nombre")
SELECT DISTINCT "tipo" FROM "inv_herramientas";

ALTER TABLE "inv_herramientas" ADD COLUMN "id_tipo" INTEGER;
UPDATE "inv_herramientas" AS h
SET "id_tipo" = t."id"
FROM "inv_tipos_herramienta" AS t
WHERE h."tipo" = t."nombre";
ALTER TABLE "inv_herramientas" ALTER COLUMN "id_tipo" SET NOT NULL;
ALTER TABLE "inv_herramientas" DROP COLUMN "tipo";
CREATE INDEX "inv_herramientas_id_tipo_idx" ON "inv_herramientas"("id_tipo");
ALTER TABLE "inv_herramientas" ADD CONSTRAINT "inv_herramientas_id_tipo_fkey"
FOREIGN KEY ("id_tipo") REFERENCES "inv_tipos_herramienta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
