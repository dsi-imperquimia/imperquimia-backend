-- AlterTable
ALTER TABLE "proy_actividades_diarias" ADD COLUMN "nombre" VARCHAR(150);

UPDATE "proy_actividades_diarias"
SET "nombre" = COALESCE(NULLIF(BTRIM(LEFT("descripcion", 150)), ''), 'Actividad diaria')
WHERE "nombre" IS NULL;

ALTER TABLE "proy_actividades_diarias" ALTER COLUMN "nombre" SET NOT NULL;
