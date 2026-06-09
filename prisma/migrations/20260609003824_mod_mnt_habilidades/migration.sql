/*
  Warnings:

  - The primary key for the `mnt_habilidad_empleados` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `empleadoId` on the `mnt_habilidad_empleados` table. All the data in the column will be lost.
  - You are about to drop the column `habilidad_Id` on the `mnt_habilidad_empleados` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nombre]` on the table `mnt_habilidades` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `empleado_id` to the `mnt_habilidad_empleados` table without a default value. This is not possible if the table is not empty.
  - Added the required column `habilidad_id` to the `mnt_habilidad_empleados` table without a default value. This is not possible if the table is not empty.
  - Made the column `assigned_by` on table `mnt_habilidad_empleados` required. This step will fail if there are existing NULL values in that column.
  - Made the column `descripcion` on table `mnt_habilidades` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "mnt_habilidad_empleados" DROP CONSTRAINT "mnt_habilidad_empleados_empleadoId_fkey";

-- DropForeignKey
ALTER TABLE "mnt_habilidad_empleados" DROP CONSTRAINT "mnt_habilidad_empleados_habilidad_Id_fkey";

-- AlterTable
ALTER TABLE "mnt_habilidad_empleados" DROP CONSTRAINT "mnt_habilidad_empleados_pkey",
DROP COLUMN "empleadoId",
DROP COLUMN "habilidad_Id",
ADD COLUMN     "empleado_id" INTEGER NOT NULL,
ADD COLUMN     "habilidad_id" INTEGER NOT NULL,
ALTER COLUMN "assigned_by" SET NOT NULL,
ALTER COLUMN "assigned_by" SET DEFAULT 'Sistema',
ADD CONSTRAINT "mnt_habilidad_empleados_pkey" PRIMARY KEY ("empleado_id", "habilidad_id");

-- AlterTable
ALTER TABLE "mnt_habilidades" ALTER COLUMN "descripcion" SET NOT NULL,
ALTER COLUMN "descripcion" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "mnt_habilidades_nombre_key" ON "mnt_habilidades"("nombre");

-- AddForeignKey
ALTER TABLE "mnt_habilidad_empleados" ADD CONSTRAINT "mnt_habilidad_empleados_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "mnt_empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_habilidad_empleados" ADD CONSTRAINT "mnt_habilidad_empleados_habilidad_id_fkey" FOREIGN KEY ("habilidad_id") REFERENCES "mnt_habilidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
