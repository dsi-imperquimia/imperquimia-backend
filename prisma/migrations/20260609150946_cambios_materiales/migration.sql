/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `mnt_materiales` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "mnt_materiales" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "ficha_tecnica" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "mnt_materiales_codigo_key" ON "mnt_materiales"("codigo");
