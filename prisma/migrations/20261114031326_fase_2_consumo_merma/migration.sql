-- CreateEnum
CREATE TYPE "ClasificacionConsumoMaterial" AS ENUM ('PRODUCCION', 'PERDIDA', 'CIERRE');

-- CreateEnum
CREATE TYPE "FuenteConsumoMaterial" AS ENUM ('MANUAL', 'BITACORA', 'CIERRE_PROYECTO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MotivoMovimientoMaterial" ADD VALUE 'CONSUMO_PROYECTO';
ALTER TYPE "MotivoMovimientoMaterial" ADD VALUE 'MERMA_PROYECTO';
ALTER TYPE "MotivoMovimientoMaterial" ADD VALUE 'CIERRE_PROYECTO';
ALTER TYPE "MotivoMovimientoMaterial" ADD VALUE 'REVERSO_CONSUMO';

-- CreateTable
CREATE TABLE "proy_consumos_materiales" (
    "id" SERIAL NOT NULL,
    "clave_operacion" UUID NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "clasificacion" "ClasificacionConsumoMaterial" NOT NULL,
    "fuente" "FuenteConsumoMaterial" NOT NULL DEFAULT 'MANUAL',
    "motivo" TEXT,
    "fecha_jornada" DATE NOT NULL,
    "actividad_referencia" TEXT,
    "reporte_referencia" TEXT,
    "movimiento_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "clave_reverso" UUID,
    "movimiento_reverso_id" INTEGER,
    "anulado_at" TIMESTAMP(3),
    "anulado_por_id" INTEGER,
    "motivo_anulacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proy_consumos_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proy_consumos_materiales_clave_operacion_key" ON "proy_consumos_materiales"("clave_operacion");

-- CreateIndex
CREATE UNIQUE INDEX "proy_consumos_materiales_movimiento_id_key" ON "proy_consumos_materiales"("movimiento_id");

-- CreateIndex
CREATE UNIQUE INDEX "proy_consumos_materiales_clave_reverso_key" ON "proy_consumos_materiales"("clave_reverso");

-- CreateIndex
CREATE UNIQUE INDEX "proy_consumos_materiales_movimiento_reverso_id_key" ON "proy_consumos_materiales"("movimiento_reverso_id");

-- CreateIndex
CREATE INDEX "proy_consumos_materiales_proyecto_id_fecha_jornada_idx" ON "proy_consumos_materiales"("proyecto_id", "fecha_jornada");

-- CreateIndex
CREATE INDEX "proy_consumos_materiales_material_id_fecha_jornada_idx" ON "proy_consumos_materiales"("material_id", "fecha_jornada");

-- AddForeignKey
ALTER TABLE "proy_consumos_materiales" ADD CONSTRAINT "proy_consumos_materiales_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_consumos_materiales" ADD CONSTRAINT "proy_consumos_materiales_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "mnt_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_consumos_materiales" ADD CONSTRAINT "proy_consumos_materiales_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "inv_movimientos_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_consumos_materiales" ADD CONSTRAINT "proy_consumos_materiales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_consumos_materiales" ADD CONSTRAINT "proy_consumos_materiales_movimiento_reverso_id_fkey" FOREIGN KEY ("movimiento_reverso_id") REFERENCES "inv_movimientos_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_consumos_materiales" ADD CONSTRAINT "proy_consumos_materiales_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
