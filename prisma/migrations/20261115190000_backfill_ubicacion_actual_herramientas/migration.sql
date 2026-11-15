-- La migración que agregó "ubicacion_actual" (fase_3_reporte_defecto_ubicacion)
-- le asignó BODEGA por defecto a TODAS las herramientas existentes, sin
-- respetar su estado real. Esto desincroniza MovimientoService.create, que
-- ahora exige que "origen" coincida exactamente con ubicacion_actual.
-- Reconstruye la ubicación a partir del estado para las herramientas que
-- quedaron en el valor por defecto.
UPDATE "inv_herramientas"
SET "ubicacion_actual" = CASE "estado"
  WHEN 'EN_PROYECTO' THEN 'PROYECTO'
  WHEN 'MANTENIMIENTO' THEN 'TALLER'
  WHEN 'DESECHO' THEN 'DESECHO'
  ELSE "ubicacion_actual"
END
WHERE "estado" IN ('EN_PROYECTO', 'MANTENIMIENTO', 'DESECHO')
  AND "ubicacion_actual" = 'BODEGA';
