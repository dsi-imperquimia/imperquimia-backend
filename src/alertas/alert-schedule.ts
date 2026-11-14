import { FrecuenciaAlerta } from '@gen/prisma/client';

export type ReglaProgramacion = {
  diasAntes: number;
  frecuencia: FrecuenciaAlerta;
  cadaNDias: number | null;
  diasEspecificos: number[];
};

export function fechaLocal(now: Date, timeZone: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const parte = (tipo: string) =>
    partes.find((item) => item.type === tipo)!.value;
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

export function diasEntre(inicio: string, fin: string): number {
  return Math.round(
    (Date.parse(`${fin}T00:00:00.000Z`) -
      Date.parse(`${inicio}T00:00:00.000Z`)) /
      86_400_000,
  );
}

export function restarDias(fecha: string, dias: number): string {
  const fechaUtc = new Date(`${fecha}T00:00:00.000Z`);
  fechaUtc.setUTCDate(fechaUtc.getUTCDate() - dias);
  return fechaUtc.toISOString().slice(0, 10);
}

export function debeGenerarse(
  regla: ReglaProgramacion,
  fechaFin: string,
  hoy: string,
  yaGenerada: boolean,
): boolean {
  const inicio = restarDias(fechaFin, regla.diasAntes);
  if (hoy < inicio) return false;
  if (regla.frecuencia === FrecuenciaAlerta.UNA_VEZ) return !yaGenerada;
  if (regla.frecuencia === FrecuenciaAlerta.DIARIA) return true;
  const diasDesdeInicio = diasEntre(inicio, hoy);
  if (regla.frecuencia === FrecuenciaAlerta.CADA_N_DIAS) {
    return diasDesdeInicio % (regla.cadaNDias ?? 1) === 0;
  }
  const diaSemana = new Date(`${hoy}T00:00:00.000Z`).getUTCDay();
  return regla.diasEspecificos.includes(diaSemana);
}
