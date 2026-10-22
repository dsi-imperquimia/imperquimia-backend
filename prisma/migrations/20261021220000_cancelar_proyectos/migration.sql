ALTER TYPE "EstadoProyecto" ADD VALUE IF NOT EXISTS 'CANCELADO';

UPDATE "mnt_permissions"
SET "description" = 'Permiso para cancelar proyectos'
WHERE "name" = 'PROYECTO_DELETE';
