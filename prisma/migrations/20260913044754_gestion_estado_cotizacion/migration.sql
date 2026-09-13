/*
  Warnings:

  - The values [ACTIVA,DESACTIVADA] on the enum `EstadoCotizacion` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[cotizacion_id]` on the table `proy_proyectos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EstadoCotizacion_new" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');
ALTER TABLE "public"."cot_cotizaciones" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "cot_cotizaciones" ALTER COLUMN "estado" TYPE "EstadoCotizacion_new" USING ("estado"::text::"EstadoCotizacion_new");
ALTER TYPE "EstadoCotizacion" RENAME TO "EstadoCotizacion_old";
ALTER TYPE "EstadoCotizacion_new" RENAME TO "EstadoCotizacion";
DROP TYPE "public"."EstadoCotizacion_old";
ALTER TABLE "cot_cotizaciones" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';
COMMIT;

-- AlterTable
ALTER TABLE "cot_cotizaciones" ADD COLUMN     "estado_cambiado_at" TIMESTAMP(3),
ADD COLUMN     "estado_cambiado_por_id" INTEGER,
ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE "proy_proyectos" ADD COLUMN     "cotizacion_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "proy_proyectos_cotizacion_id_key" ON "proy_proyectos"("cotizacion_id");

-- AddForeignKey
ALTER TABLE "cot_cotizaciones" ADD CONSTRAINT "cot_cotizaciones_estado_cambiado_por_id_fkey" FOREIGN KEY ("estado_cambiado_por_id") REFERENCES "mnt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_proyectos" ADD CONSTRAINT "proy_proyectos_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cot_cotizaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
