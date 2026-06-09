/*
  Warnings:

  - You are about to drop the `mnt_habilidad_empleados` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "mnt_habilidad_empleados" DROP CONSTRAINT "mnt_habilidad_empleados_empleado_id_fkey";

-- DropForeignKey
ALTER TABLE "mnt_habilidad_empleados" DROP CONSTRAINT "mnt_habilidad_empleados_habilidad_id_fkey";

-- DropTable
DROP TABLE "mnt_habilidad_empleados";

-- CreateTable
CREATE TABLE "habilidades_empleados" (
    "empleado_id" INTEGER NOT NULL,
    "habilidad_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL DEFAULT 'Sistema',

    CONSTRAINT "habilidades_empleados_pkey" PRIMARY KEY ("empleado_id","habilidad_id")
);

-- AddForeignKey
ALTER TABLE "habilidades_empleados" ADD CONSTRAINT "habilidades_empleados_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "mnt_empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habilidades_empleados" ADD CONSTRAINT "habilidades_empleados_habilidad_id_fkey" FOREIGN KEY ("habilidad_id") REFERENCES "mnt_habilidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
