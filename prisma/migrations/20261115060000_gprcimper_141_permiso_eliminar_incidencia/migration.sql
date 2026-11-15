-- Permiso para eliminar (borrado lógico) incidencias
INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 42, 'INCIDENCIA_DELETE', 'Permiso para eliminar incidencias en obra', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "mnt_permissions" WHERE "id" = 42 OR "name" = 'INCIDENCIA_DELETE');

-- Asignar a Administrador y Jefe de proyecto
INSERT INTO "mnt_role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "mnt_roles" r
CROSS JOIN "mnt_permissions" p
WHERE r."name" IN ('Administrador', 'Jefe de proyecto')
  AND p."name" = 'INCIDENCIA_DELETE'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('"mnt_permissions"', 'id'),
  COALESCE(MAX("id"), 0) + 1,
  false
) FROM "mnt_permissions";
