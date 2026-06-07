-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('ACTIVA', 'DESACTIVADA');

-- CreateTable
CREATE TABLE "mnt_materiales" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidad" TEXT NOT NULL,
    "costo_unitario" DECIMAL(10,2) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mnt_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cot_cotizaciones" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sub_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_iva" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'ACTIVA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cot_cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cot_detalle_cotizaciones" (
    "id" SERIAL NOT NULL,
    "cotizacion_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" TEXT NOT NULL,
    "costo_unitario" DECIMAL(10,2) NOT NULL,
    "sub_total" DECIMAL(10,2) NOT NULL,
    "total_iva" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cot_detalle_cotizaciones_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cot_cotizaciones" ADD CONSTRAINT "cot_cotizaciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cot_detalle_cotizaciones" ADD CONSTRAINT "cot_detalle_cotizaciones_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cot_cotizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cot_detalle_cotizaciones" ADD CONSTRAINT "cot_detalle_cotizaciones_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "mnt_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
