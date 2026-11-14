-- CreateEnum
CREATE TYPE "TipoUbicacionMaterial" AS ENUM ('BODEGA', 'PROYECTO');

-- CreateEnum
CREATE TYPE "TipoMovimientoMaterial" AS ENUM ('ENTRADA', 'SALIDA', 'TRASLADO');

-- CreateEnum
CREATE TYPE "MotivoMovimientoMaterial" AS ENUM ('COMPRA', 'DEVOLUCION_PROYECTO', 'USO_PROYECTO', 'VENTA', 'OTRO');

-- CreateTable
CREATE TABLE "inv_ubicaciones_materiales" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoUbicacionMaterial" NOT NULL,
    "proyecto_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_ubicaciones_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_existencias_materiales" (
    "id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "ubicacion_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_existencias_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_movimientos_materiales" (
    "id" SERIAL NOT NULL,
    "clave_operacion" UUID NOT NULL,
    "material_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "tipo" "TipoMovimientoMaterial" NOT NULL,
    "motivo" "MotivoMovimientoMaterial" NOT NULL,
    "origen_id" INTEGER,
    "destino_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "observacion" TEXT,
    "fecha_movimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inv_movimientos_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inv_ubicaciones_materiales_codigo_key" ON "inv_ubicaciones_materiales"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "inv_ubicaciones_materiales_proyecto_id_key" ON "inv_ubicaciones_materiales"("proyecto_id");

-- CreateIndex
CREATE INDEX "inv_existencias_materiales_ubicacion_id_idx" ON "inv_existencias_materiales"("ubicacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_existencias_materiales_material_id_ubicacion_id_key" ON "inv_existencias_materiales"("material_id", "ubicacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_movimientos_materiales_clave_operacion_key" ON "inv_movimientos_materiales"("clave_operacion");

-- CreateIndex
CREATE INDEX "inv_movimientos_materiales_material_id_fecha_movimiento_idx" ON "inv_movimientos_materiales"("material_id", "fecha_movimiento");

-- CreateIndex
CREATE INDEX "inv_movimientos_materiales_origen_id_idx" ON "inv_movimientos_materiales"("origen_id");

-- CreateIndex
CREATE INDEX "inv_movimientos_materiales_destino_id_idx" ON "inv_movimientos_materiales"("destino_id");

-- AddForeignKey
ALTER TABLE "inv_ubicaciones_materiales" ADD CONSTRAINT "inv_ubicaciones_materiales_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_existencias_materiales" ADD CONSTRAINT "inv_existencias_materiales_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "mnt_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_existencias_materiales" ADD CONSTRAINT "inv_existencias_materiales_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "inv_ubicaciones_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movimientos_materiales" ADD CONSTRAINT "inv_movimientos_materiales_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "mnt_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movimientos_materiales" ADD CONSTRAINT "inv_movimientos_materiales_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "inv_ubicaciones_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movimientos_materiales" ADD CONSTRAINT "inv_movimientos_materiales_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "inv_ubicaciones_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movimientos_materiales" ADD CONSTRAINT "inv_movimientos_materiales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
