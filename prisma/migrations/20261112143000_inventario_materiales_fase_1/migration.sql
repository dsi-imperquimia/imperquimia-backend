-- GPRCIMPER-94 / GPRCIMPER-95: inventario de materiales por ubicación.
CREATE TYPE "TipoUbicacionMaterial" AS ENUM ('BODEGA', 'PROYECTO');
CREATE TYPE "TipoMovimientoMaterial" AS ENUM ('ENTRADA', 'SALIDA', 'TRASLADO');
CREATE TYPE "MotivoMovimientoMaterial" AS ENUM ('COMPRA', 'DEVOLUCION_PROYECTO', 'USO_PROYECTO', 'VENTA', 'OTRO');

CREATE TABLE "inv_ubicaciones_materiales" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" "TipoUbicacionMaterial" NOT NULL,
  "proyecto_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inv_ubicaciones_materiales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inv_ubicaciones_materiales_tipo_proyecto_check" CHECK (
    ("tipo" = 'BODEGA' AND "proyecto_id" IS NULL) OR
    ("tipo" = 'PROYECTO' AND "proyecto_id" IS NOT NULL)
  )
);

CREATE TABLE "inv_existencias_materiales" (
  "id" SERIAL NOT NULL,
  "material_id" INTEGER NOT NULL,
  "ubicacion_id" INTEGER NOT NULL,
  "cantidad" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inv_existencias_materiales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inv_existencias_materiales_cantidad_check" CHECK ("cantidad" >= 0)
);

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
  CONSTRAINT "inv_movimientos_materiales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inv_movimientos_materiales_cantidad_check" CHECK ("cantidad" > 0),
  CONSTRAINT "inv_movimientos_materiales_ubicacion_check" CHECK ("origen_id" IS NOT NULL OR "destino_id" IS NOT NULL),
  CONSTRAINT "inv_movimientos_materiales_ubicaciones_distintas_check" CHECK ("origen_id" IS NULL OR "destino_id" IS NULL OR "origen_id" <> "destino_id")
);

CREATE UNIQUE INDEX "inv_ubicaciones_materiales_codigo_key" ON "inv_ubicaciones_materiales"("codigo");
CREATE UNIQUE INDEX "inv_ubicaciones_materiales_proyecto_id_key" ON "inv_ubicaciones_materiales"("proyecto_id");
CREATE UNIQUE INDEX "inv_ubicaciones_materiales_una_bodega_key" ON "inv_ubicaciones_materiales"("tipo") WHERE "tipo" = 'BODEGA';
CREATE UNIQUE INDEX "inv_existencias_materiales_material_id_ubicacion_id_key" ON "inv_existencias_materiales"("material_id", "ubicacion_id");
CREATE INDEX "inv_existencias_materiales_ubicacion_id_idx" ON "inv_existencias_materiales"("ubicacion_id");
CREATE UNIQUE INDEX "inv_movimientos_materiales_clave_operacion_key" ON "inv_movimientos_materiales"("clave_operacion");
CREATE INDEX "inv_movimientos_materiales_material_id_fecha_movimiento_idx" ON "inv_movimientos_materiales"("material_id", "fecha_movimiento");
CREATE INDEX "inv_movimientos_materiales_origen_id_idx" ON "inv_movimientos_materiales"("origen_id");
CREATE INDEX "inv_movimientos_materiales_destino_id_idx" ON "inv_movimientos_materiales"("destino_id");

ALTER TABLE "inv_ubicaciones_materiales" ADD CONSTRAINT "inv_ubicaciones_materiales_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inv_existencias_materiales" ADD CONSTRAINT "inv_existencias_materiales_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "mnt_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inv_existencias_materiales" ADD CONSTRAINT "inv_existencias_materiales_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "inv_ubicaciones_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inv_movimientos_materiales" ADD CONSTRAINT "inv_movimientos_materiales_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "mnt_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inv_movimientos_materiales" ADD CONSTRAINT "inv_movimientos_materiales_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "inv_ubicaciones_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inv_movimientos_materiales" ADD CONSTRAINT "inv_movimientos_materiales_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "inv_ubicaciones_materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inv_movimientos_materiales" ADD CONSTRAINT "inv_movimientos_materiales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
