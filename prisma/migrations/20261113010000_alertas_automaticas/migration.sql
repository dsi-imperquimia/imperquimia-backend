CREATE TYPE "CanalAlerta" AS ENUM ('INTERNA');
CREATE TYPE "FrecuenciaAlerta" AS ENUM ('UNA_VEZ', 'DIARIA', 'CADA_N_DIAS', 'DIAS_ESPECIFICOS');
CREATE TYPE "EstadoNotificacionAlerta" AS ENUM ('NUEVA', 'VISUALIZADA', 'ATENDIDA');
CREATE TYPE "AccionAuditoriaAlerta" AS ENUM ('CREADA', 'EDITADA', 'ELIMINADA');

CREATE TABLE "mnt_alerta_configuraciones" (
  "id" SERIAL NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "proyecto_id" INTEGER NOT NULL,
  "dias_antes" INTEGER NOT NULL,
  "canal" "CanalAlerta" NOT NULL DEFAULT 'INTERNA',
  "frecuencia" "FrecuenciaAlerta" NOT NULL DEFAULT 'UNA_VEZ',
  "cada_n_dias" INTEGER,
  "dias_especificos" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "creado_por_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "mnt_alerta_configuraciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mnt_alerta_notificaciones" (
  "id" SERIAL NOT NULL,
  "regla_id" INTEGER NOT NULL,
  "configuracion_id" INTEGER,
  "proyecto_id" INTEGER,
  "nombre_configuracion" TEXT NOT NULL,
  "nombre_proyecto" TEXT NOT NULL,
  "descripcion" TEXT,
  "estado" "EstadoNotificacionAlerta" NOT NULL DEFAULT 'NUEVA',
  "primera_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultima_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultima_fecha_programada" DATE NOT NULL,
  "visualizada_at" TIMESTAMP(3),
  "atendida_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mnt_alerta_notificaciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mnt_alerta_auditoria" (
  "id" SERIAL NOT NULL,
  "configuracion_id" INTEGER,
  "usuario_id" INTEGER,
  "accion" "AccionAuditoriaAlerta" NOT NULL,
  "datos" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mnt_alerta_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mnt_alerta_configuraciones_proyecto_id_activa_idx" ON "mnt_alerta_configuraciones"("proyecto_id", "activa");
CREATE UNIQUE INDEX "alert_notif_regla_proyecto_fecha_uq" ON "mnt_alerta_notificaciones"("regla_id", "proyecto_id", "ultima_fecha_programada");
CREATE INDEX "mnt_alerta_notificaciones_estado_ultima_generacion_idx" ON "mnt_alerta_notificaciones"("estado", "ultima_generacion");
CREATE INDEX "mnt_alerta_auditoria_configuracion_id_created_at_idx" ON "mnt_alerta_auditoria"("configuracion_id", "created_at");

ALTER TABLE "mnt_alerta_configuraciones" ADD CONSTRAINT "mnt_alerta_configuraciones_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mnt_alerta_configuraciones" ADD CONSTRAINT "mnt_alerta_configuraciones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "mnt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mnt_alerta_notificaciones" ADD CONSTRAINT "mnt_alerta_notificaciones_configuracion_id_fkey" FOREIGN KEY ("configuracion_id") REFERENCES "mnt_alerta_configuraciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mnt_alerta_notificaciones" ADD CONSTRAINT "mnt_alerta_notificaciones_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mnt_alerta_auditoria" ADD CONSTRAINT "mnt_alerta_auditoria_configuracion_id_fkey" FOREIGN KEY ("configuracion_id") REFERENCES "mnt_alerta_configuraciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mnt_alerta_auditoria" ADD CONSTRAINT "mnt_alerta_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "mnt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;