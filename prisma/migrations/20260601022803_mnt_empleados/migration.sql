-- CreateTable
CREATE TABLE "mnt_empleados" (
    "id_empleado" SERIAL NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "dui" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "id_cargo" INTEGER NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mnt_empleados_pkey" PRIMARY KEY ("id_empleado")
);

-- CreateIndex
CREATE UNIQUE INDEX "mnt_empleados_dui_key" ON "mnt_empleados"("dui");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_empleados_nit_key" ON "mnt_empleados"("nit");
