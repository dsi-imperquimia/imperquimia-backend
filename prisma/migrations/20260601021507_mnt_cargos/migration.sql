-- CreateTable
CREATE TABLE "mnt_cargos" (
    "id_cargo" SERIAL NOT NULL,
    "nombre_cargo" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mnt_cargos_pkey" PRIMARY KEY ("id_cargo")
);

-- CreateIndex
CREATE UNIQUE INDEX "mnt_cargos_nombre_cargo_key" ON "mnt_cargos"("nombre_cargo");
