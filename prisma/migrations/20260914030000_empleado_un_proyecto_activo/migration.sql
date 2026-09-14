-- Un empleado puede tener historial en varios proyectos, pero solo una asignacion abierta.
CREATE UNIQUE INDEX "proy_empleado_asignacion_activa_key"
ON "proy_proyecto_empleados" ("empleado_id")
WHERE "fecha_retiro" IS NULL;
