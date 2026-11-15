-- CreateEnum
CREATE TYPE "PrioridadIncidencia" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('ABIERTA', 'EN_PROCESO', 'RESUELTA');

-- CreateTable
CREATE TABLE "proy_incidencias" (
    "id" SERIAL NOT NULL,
    "clave_operacion" UUID NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "prioridad" "PrioridadIncidencia" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'ABIERTA',
    "actividad_diaria_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "proy_incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proy_incidencias_historial" (
    "id" SERIAL NOT NULL,
    "incidencia_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "estado_anterior" "EstadoIncidencia",
    "estado_nuevo" "EstadoIncidencia" NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proy_incidencias_historial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proy_incidencias_clave_operacion_key" ON "proy_incidencias"("clave_operacion");

-- CreateIndex
CREATE INDEX "proy_incidencias_proyecto_id_estado_idx" ON "proy_incidencias"("proyecto_id", "estado");

-- CreateIndex
CREATE INDEX "proy_incidencias_actividad_diaria_id_idx" ON "proy_incidencias"("actividad_diaria_id");

-- CreateIndex
CREATE INDEX "proy_incidencias_historial_incidencia_id_created_at_idx" ON "proy_incidencias_historial"("incidencia_id", "created_at");

-- AddForeignKey
ALTER TABLE "proy_incidencias" ADD CONSTRAINT "proy_incidencias_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_incidencias" ADD CONSTRAINT "proy_incidencias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_incidencias" ADD CONSTRAINT "proy_incidencias_actividad_diaria_id_fkey" FOREIGN KEY ("actividad_diaria_id") REFERENCES "proy_actividades_diarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_incidencias_historial" ADD CONSTRAINT "proy_incidencias_historial_incidencia_id_fkey" FOREIGN KEY ("incidencia_id") REFERENCES "proy_incidencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_incidencias_historial" ADD CONSTRAINT "proy_incidencias_historial_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Permisos de incidencias (por nombre; el id se toma de la secuencia si ya hay otro igual)
INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 39, 'INCIDENCIA_CREATE', 'Permiso para registrar incidencias en obra', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "mnt_permissions" WHERE "id" = 39 OR "name" = 'INCIDENCIA_CREATE');

INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 40, 'INCIDENCIA_READ', 'Permiso para consultar incidencias en obra', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "mnt_permissions" WHERE "id" = 40 OR "name" = 'INCIDENCIA_READ');

INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 41, 'INCIDENCIA_UPDATE', 'Permiso para editar incidencias y cambiar su estado', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "mnt_permissions" WHERE "id" = 41 OR "name" = 'INCIDENCIA_UPDATE');

-- Asignar a Administrador y Jefe de proyecto
INSERT INTO "mnt_role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "mnt_roles" r
CROSS JOIN "mnt_permissions" p
WHERE r."name" IN ('Administrador', 'Jefe de proyecto')
  AND p."name" IN ('INCIDENCIA_CREATE', 'INCIDENCIA_READ', 'INCIDENCIA_UPDATE')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('"mnt_permissions"', 'id'),
  COALESCE(MAX("id"), 0) + 1,
  false
) FROM "mnt_permissions";
