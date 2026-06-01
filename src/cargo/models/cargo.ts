// Modelo TypeScript que representa un Cargo
export interface Cargo {
  id: number;
  nombre: string;
  deletedAt?: Date | null;
}

export type CargoResponse = Cargo;
