export type AlertaVencimiento = 'VENCIDO' | 'PROXIMO' | null;

const DIAS_ANTICIPACION = 7;

// Solo los proyectos activos entran en alerta: si ya está cancelado,
// finalizado, pagado o en garantía, su fecha de fin ya no es relevante (GPRCIMPER-26).
export function calcularAlertaVencimiento(
  estado: string,
  fechaFin: Date | string | null,
): AlertaVencimiento {
  if (estado !== 'ACTIVO' || !fechaFin) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(0, 0, 0, 0);
  const diasRestantes = Math.round(
    (fin.getTime() - hoy.getTime()) / 86_400_000,
  );
  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= DIAS_ANTICIPACION) return 'PROXIMO';
  return null;
}
