-- AlterTable
ALTER TABLE "proy_proyectos" ADD COLUMN "alerta_proxima_enviada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "proy_proyectos" ADD COLUMN "alerta_vencida_enviada" BOOLEAN NOT NULL DEFAULT false;
