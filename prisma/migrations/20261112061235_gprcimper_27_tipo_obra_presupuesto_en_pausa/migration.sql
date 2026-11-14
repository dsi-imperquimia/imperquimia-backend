-- CreateEnum
CREATE TYPE "TipoObra" AS ENUM ('RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'INFRAESTRUCTURA', 'OTRO');

-- AlterEnum
ALTER TYPE "EstadoProyecto" ADD VALUE 'EN_PAUSA';

-- AlterTable
ALTER TABLE "proy_proyectos" ADD COLUMN     "presupuesto" DECIMAL(10,2),
ADD COLUMN     "tipo_obra" "TipoObra";
