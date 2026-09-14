-- AlterTable
ALTER TABLE "proy_proyectos" ADD COLUMN     "cliente" TEXT,
ADD COLUMN     "creado_por_id" INTEGER,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fecha_fin" DATE,
ADD COLUMN     "fecha_inicio" DATE,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "sub_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_iva" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "proy_detalle_proyectos" (
    "id" SERIAL NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" TEXT NOT NULL,
    "costo_unitario" DECIMAL(10,2) NOT NULL,
    "sub_total" DECIMAL(10,2) NOT NULL,
    "total_iva" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proy_detalle_proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proy_detalle_proyectos_proyecto_id_material_id_key" ON "proy_detalle_proyectos"("proyecto_id", "material_id");

-- AddForeignKey
ALTER TABLE "proy_proyectos" ADD CONSTRAINT "proy_proyectos_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "mnt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_detalle_proyectos" ADD CONSTRAINT "proy_detalle_proyectos_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_detalle_proyectos" ADD CONSTRAINT "proy_detalle_proyectos_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "mnt_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
