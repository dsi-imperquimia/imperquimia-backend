-- DropIndex
DROP INDEX "mnt_alerta_notificaciones_estado_ultima_generacion_idx";

-- RenameIndex
ALTER INDEX "mnt_alerta_notificaciones_destinatario_id_estado_ultima_generac" RENAME TO "mnt_alerta_notificaciones_destinatario_id_estado_ultima_gen_idx";
