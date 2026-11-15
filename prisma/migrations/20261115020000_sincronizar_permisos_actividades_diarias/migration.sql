-- Insertar permisos de actividades diarias si aún no existen por ID o nombre
INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 36, 'ACTIVIDAD_CREATE', 'Permiso para registrar actividades diarias', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "mnt_permissions" WHERE "id" = 36 OR "name" = 'ACTIVIDAD_CREATE'
);

INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 37, 'ACTIVIDAD_READ', 'Permiso para consultar actividades diarias', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "mnt_permissions" WHERE "id" = 37 OR "name" = 'ACTIVIDAD_READ'
);

INSERT INTO "mnt_permissions" ("id", "name", "description", "updated_at")
SELECT 38, 'ACTIVIDAD_UPDATE', 'Permiso para editar actividades diarias', CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "mnt_permissions" WHERE "id" = 38 OR "name" = 'ACTIVIDAD_UPDATE'
);

-- Asignar ACTIVIDAD_CREATE, ACTIVIDAD_READ y ACTIVIDAD_UPDATE a Administrador y Jefe de proyecto
INSERT INTO "mnt_role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id"
FROM "mnt_roles" r
CROSS JOIN "mnt_permissions" p
WHERE r."name" IN ('Administrador', 'Jefe de proyecto')
  AND p."name" IN ('ACTIVIDAD_CREATE', 'ACTIVIDAD_READ', 'ACTIVIDAD_UPDATE')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Retirar permisos de actividades diarias del rol Técnico si existían de una semilla previa
DELETE FROM "mnt_role_permissions" rp
USING "mnt_roles" r, "mnt_permissions" p
WHERE rp."role_id" = r."id"
  AND rp."permission_id" = p."id"
  AND r."name" = 'Técnico'
  AND p."name" IN ('ACTIVIDAD_CREATE', 'ACTIVIDAD_READ', 'ACTIVIDAD_UPDATE');

-- Sincronizar la secuencia de mnt_permissions
SELECT setval(
  pg_get_serial_sequence('"mnt_permissions"', 'id'),
  COALESCE(MAX("id"), 0) + 1,
  false
) FROM "mnt_permissions";
