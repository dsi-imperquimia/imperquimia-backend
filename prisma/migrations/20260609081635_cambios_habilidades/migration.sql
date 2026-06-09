/*
  Warnings:

  - You are about to drop the `habilidades_empleados` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "habilidades_empleados" DROP CONSTRAINT "habilidades_empleados_empleado_id_fkey";

-- DropForeignKey
ALTER TABLE "habilidades_empleados" DROP CONSTRAINT "habilidades_empleados_habilidad_id_fkey";

-- DropTable
DROP TABLE "habilidades_empleados";

-- CreateTable
CREATE TABLE "habilidad_empleados" (
    "empleado_id" INTEGER NOT NULL,
    "habilidad_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL DEFAULT 'Sistema',

    CONSTRAINT "habilidad_empleados_pkey" PRIMARY KEY ("empleado_id","habilidad_id")
);

-- AddForeignKey
ALTER TABLE "habilidad_empleados" ADD CONSTRAINT "habilidad_empleados_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "mnt_empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habilidad_empleados" ADD CONSTRAINT "habilidad_empleados_habilidad_id_fkey" FOREIGN KEY ("habilidad_id") REFERENCES "mnt_habilidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
