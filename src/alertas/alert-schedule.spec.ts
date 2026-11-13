import { FrecuenciaAlerta } from '@gen/prisma/client';
import { debeGenerarse, fechaLocal, restarDias } from './alert-schedule';

describe('programación de alertas', () => {
  it('inicia la evaluación al llegar a los días de anticipación configurados', () => {
    const regla = {
      diasAntes: 7,
      frecuencia: FrecuenciaAlerta.UNA_VEZ,
      cadaNDias: null,
      diasEspecificos: [],
    };
    expect(debeGenerarse(regla, '2026-11-20', '2026-11-12', false)).toBe(false);
    expect(debeGenerarse(regla, '2026-11-20', '2026-11-13', false)).toBe(true);
    expect(debeGenerarse(regla, '2026-11-20', '2026-11-13', true)).toBe(false);
  });

  it('repite una alerta cada N días a partir del primer día programado', () => {
    const regla = {
      diasAntes: 4,
      frecuencia: FrecuenciaAlerta.CADA_N_DIAS,
      cadaNDias: 3,
      diasEspecificos: [],
    };
    expect(debeGenerarse(regla, '2026-11-20', '2026-11-16', false)).toBe(true);
    expect(debeGenerarse(regla, '2026-11-20', '2026-11-17', true)).toBe(false);
    expect(debeGenerarse(regla, '2026-11-20', '2026-11-19', true)).toBe(true);
  });

  it('repite solo en los días de la semana seleccionados', () => {
    const regla = {
      diasAntes: 8,
      frecuencia: FrecuenciaAlerta.DIAS_ESPECIFICOS,
      cadaNDias: null,
      diasEspecificos: [1, 3],
    };
    expect(debeGenerarse(regla, '2026-11-20', '2026-11-16', false)).toBe(true);
    expect(debeGenerarse(regla, '2026-11-20', '2026-11-17', true)).toBe(false);
  });

  it('calcula fechas de proyecto como fechas calendario y usa la zona horaria indicada', () => {
    expect(restarDias('2026-03-01', 1)).toBe('2026-02-28');
    expect(
      fechaLocal(new Date('2026-11-13T05:30:00.000Z'), 'America/El_Salvador'),
    ).toBe('2026-11-12');
  });
});
