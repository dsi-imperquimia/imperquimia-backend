/*
  Warnings:

  - Added the required column `email` to the `cot_cotizaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `cot_cotizaciones` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cot_cotizaciones" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;
