-- CreateTable
CREATE TABLE "cargos" (
    "id_cargo" SERIAL NOT NULL,
    "nombre_cargo" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id_cargo")
);

-- CreateIndex
CREATE UNIQUE INDEX "cargos_nombre_cargo_key" ON "cargos"("nombre_cargo");
