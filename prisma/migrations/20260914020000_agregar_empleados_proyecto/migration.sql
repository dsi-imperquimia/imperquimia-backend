-- CreateTable
CREATE TABLE "proy_proyecto_empleados" (
    "proyecto_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_retiro" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proy_proyecto_empleados_pkey" PRIMARY KEY ("proyecto_id","empleado_id")
);

-- CreateIndex
CREATE INDEX "proy_proyecto_empleados_empleado_id_idx" ON "proy_proyecto_empleados"("empleado_id");

-- AddForeignKey
ALTER TABLE "proy_proyecto_empleados" ADD CONSTRAINT "proy_proyecto_empleados_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_proyecto_empleados" ADD CONSTRAINT "proy_proyecto_empleados_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "mnt_empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
