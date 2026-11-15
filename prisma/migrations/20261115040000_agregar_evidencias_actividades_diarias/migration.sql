-- CreateTable
CREATE TABLE "proy_actividades_evidencias" (
    "id" SERIAL NOT NULL,
    "actividad_diaria_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nombre_original" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "proy_actividades_evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proy_actividades_evidencias_actividad_diaria_id_deleted_at_idx" ON "proy_actividades_evidencias"("actividad_diaria_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "proy_actividades_evidencias" ADD CONSTRAINT "proy_actividades_evidencias_actividad_diaria_id_fkey" FOREIGN KEY ("actividad_diaria_id") REFERENCES "proy_actividades_diarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_actividades_evidencias" ADD CONSTRAINT "proy_actividades_evidencias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
