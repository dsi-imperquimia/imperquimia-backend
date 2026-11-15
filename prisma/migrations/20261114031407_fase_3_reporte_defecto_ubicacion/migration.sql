-- CreateEnum
CREATE TYPE "EstadoReporteDefecto" AS ENUM ('REQUIERE_REVISION', 'REVISADO', 'CERRADO');

-- AlterEnum
ALTER TYPE "EstadoHerramienta" ADD VALUE 'REQUIERE_REVISION';

-- AlterTable
ALTER TABLE "inv_herramientas" ADD COLUMN     "ubicacion_actual" "AreaMovimiento" NOT NULL DEFAULT 'BODEGA';

-- CreateTable
CREATE TABLE "inv_reportes_defecto_herramientas" (
    "id" SERIAL NOT NULL,
    "herramienta_id" INTEGER NOT NULL,
    "proyecto_id" INTEGER,
    "observacion" TEXT,
    "estado" "EstadoReporteDefecto" NOT NULL DEFAULT 'REQUIERE_REVISION',
    "reportado_por_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inv_reportes_defecto_herramientas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inv_reportes_defecto_herramientas_herramienta_id_created_at_idx" ON "inv_reportes_defecto_herramientas"("herramienta_id", "created_at");

-- CreateIndex
CREATE INDEX "inv_reportes_defecto_herramientas_proyecto_id_idx" ON "inv_reportes_defecto_herramientas"("proyecto_id");

-- AddForeignKey
ALTER TABLE "inv_reportes_defecto_herramientas" ADD CONSTRAINT "inv_reportes_defecto_herramientas_herramienta_id_fkey" FOREIGN KEY ("herramienta_id") REFERENCES "inv_herramientas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_reportes_defecto_herramientas" ADD CONSTRAINT "inv_reportes_defecto_herramientas_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_reportes_defecto_herramientas" ADD CONSTRAINT "inv_reportes_defecto_herramientas_reportado_por_id_fkey" FOREIGN KEY ("reportado_por_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
