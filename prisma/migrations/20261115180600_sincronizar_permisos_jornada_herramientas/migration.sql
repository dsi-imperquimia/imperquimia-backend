-- Insertar permisos de jornada de herramientas si aún no existen por ID o nombre
INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 43, 'JORNADA_HERRAMIENTA_READ', 'Permiso para consultar el checklist de herramientas de una jornada', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "mnt_permissions" WHERE "id" = 43 OR "name" = 'JORNADA_HERRAMIENTA_READ'
);

INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 44, 'JORNADA_HERRAMIENTA_VERIFY', 'Permiso para verificar el inicio y confirmar el retorno de herramientas de una jornada', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "mnt_permissions" WHERE "id" = 44 OR "name" = 'JORNADA_HERRAMIENTA_VERIFY'
);

-- Asignar JORNADA_HERRAMIENTA_READ y JORNADA_HERRAMIENTA_VERIFY a Administrador y Jefe de proyecto
INSERT INTO "mnt_role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "mnt_roles" r
CROSS JOIN "mnt_permissions" p
WHERE r."name" IN ('Administrador', 'Jefe de proyecto')
  AND p."name" IN ('JORNADA_HERRAMIENTA_READ', 'JORNADA_HERRAMIENTA_VERIFY')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Sincronizar la secuencia de mnt_permissions
SELECT setval(
  pg_get_serial_sequence('"mnt_permissions"', 'id'),
  COALESCE(MAX("id"), 0) + 1,
  false
) FROM "mnt_permissions";
