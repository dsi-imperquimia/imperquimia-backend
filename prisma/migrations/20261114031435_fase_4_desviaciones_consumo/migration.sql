-- CreateEnum
CREATE TYPE "ReglaDesviacionConsumo" AS ENUM ('EXCESO_COTIZADO', 'EXCESO_HISTORICO');

-- CreateEnum
CREATE TYPE "EstadoDesviacionConsumo" AS ENUM ('PENDIENTE', 'REVISADA', 'DESCARTADA');

-- CreateTable
CREATE TABLE "proy_desviaciones_consumo" (
    "id" SERIAL NOT NULL,
    "consumo_id" INTEGER NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "regla" "ReglaDesviacionConsumo" NOT NULL,
    "valor_observado" DECIMAL(12,2) NOT NULL,
    "valor_referencia" DECIMAL(12,2) NOT NULL,
    "factor_umbral" DECIMAL(5,2) NOT NULL DEFAULT 1.25,
    "estado" "EstadoDesviacionConsumo" NOT NULL DEFAULT 'PENDIENTE',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proy_desviaciones_consumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proy_desviaciones_consumo_proyecto_id_activa_idx" ON "proy_desviaciones_consumo"("proyecto_id", "activa");

-- CreateIndex
CREATE INDEX "proy_desviaciones_consumo_material_id_idx" ON "proy_desviaciones_consumo"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "proy_desviaciones_consumo_consumo_id_regla_key" ON "proy_desviaciones_consumo"("consumo_id", "regla");

-- AddForeignKey
ALTER TABLE "proy_desviaciones_consumo" ADD CONSTRAINT "proy_desviaciones_consumo_consumo_id_fkey" FOREIGN KEY ("consumo_id") REFERENCES "proy_consumos_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_desviaciones_consumo" ADD CONSTRAINT "proy_desviaciones_consumo_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_desviaciones_consumo" ADD CONSTRAINT "proy_desviaciones_consumo_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "mnt_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
