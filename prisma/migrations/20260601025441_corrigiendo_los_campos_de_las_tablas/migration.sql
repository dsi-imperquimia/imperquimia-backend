/*
  Warnings:

  - The primary key for the `mnt_cargos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_cargo` on the `mnt_cargos` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_cargo` on the `mnt_cargos` table. All the data in the column will be lost.
  - The primary key for the `mnt_empleados` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_empleado` on the `mnt_empleados` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nombre]` on the table `mnt_cargos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nombre` to the `mnt_cargos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `mnt_empleados` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "mnt_cargos_nombre_cargo_key";

-- AlterTable
ALTER TABLE "mnt_cargos" DROP CONSTRAINT "mnt_cargos_pkey",
DROP COLUMN "id_cargo",
DROP COLUMN "nombre_cargo",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "nombre" TEXT NOT NULL,
ADD CONSTRAINT "mnt_cargos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "mnt_empleados" DROP CONSTRAINT "mnt_empleados_pkey",
DROP COLUMN "id_empleado",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "mnt_empleados_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "mnt_cargos_nombre_key" ON "mnt_cargos"("nombre");

-- AddForeignKey
ALTER TABLE "mnt_empleados" ADD CONSTRAINT "mnt_empleados_id_cargo_fkey" FOREIGN KEY ("id_cargo") REFERENCES "mnt_cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
