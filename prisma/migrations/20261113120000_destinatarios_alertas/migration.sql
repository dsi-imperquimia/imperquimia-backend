ALTER TABLE "mnt_alerta_notificaciones"
  ALTER COLUMN "regla_id" DROP NOT NULL,
  ADD COLUMN "destinatario_id" INTEGER,
  ADD COLUMN "creada_por_id" INTEGER;

DROP INDEX IF EXISTS "alert_notif_regla_proyecto_fecha_uq";

CREATE UNIQUE INDEX "alert_notif_regla_proyecto_destino_fecha_uq"
  ON "mnt_alerta_notificaciones"("regla_id", "proyecto_id", "destinatario_id", "ultima_fecha_programada");

CREATE INDEX "mnt_alerta_notificaciones_destinatario_id_estado_ultima_generacion_idx"
  ON "mnt_alerta_notificaciones"("destinatario_id", "estado", "ultima_generacion");

ALTER TABLE "mnt_alerta_notificaciones"
  ADD CONSTRAINT "mnt_alerta_notificaciones_destinatario_id_fkey"
    FOREIGN KEY ("destinatario_id") REFERENCES "mnt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "mnt_alerta_notificaciones_creada_por_id_fkey"
    FOREIGN KEY ("creada_por_id") REFERENCES "mnt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
