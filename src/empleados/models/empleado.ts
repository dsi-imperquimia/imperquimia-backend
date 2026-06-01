// Modelo TypeScript que representa un Empleado
export interface Empleado {
  id: number;
  nombreCompleto: string;
  dui: string;
  nit: string;
  cargoId: number;
  activo: boolean;
  fechaRegistro: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Alias para respuestas desde el servicio/repo
export type EmpleadoResponse = Empleado;
