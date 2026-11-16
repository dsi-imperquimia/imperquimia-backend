-- CreateTable
CREATE TABLE "proy_actividades_diarias" (
    "id" SERIAL NOT NULL,
    "clave_operacion" UUID NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "empleado_id" INTEGER,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "proy_actividades_diarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proy_actividades_diarias_clave_operacion_key" ON "proy_actividades_diarias"("clave_operacion");

-- CreateIndex
CREATE INDEX "proy_actividades_diarias_proyecto_id_fecha_idx" ON "proy_actividades_diarias"("proyecto_id", "fecha");

-- CreateIndex
CREATE INDEX "proy_actividades_diarias_usuario_id_fecha_idx" ON "proy_actividades_diarias"("usuario_id", "fecha");

-- AddForeignKey
ALTER TABLE "proy_actividades_diarias" ADD CONSTRAINT "proy_actividades_diarias_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_actividades_diarias" ADD CONSTRAINT "proy_actividades_diarias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_actividades_diarias" ADD CONSTRAINT "proy_actividades_diarias_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "mnt_empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
