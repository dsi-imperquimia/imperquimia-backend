// Modelo TypeScript que representa la fila de la tabla `empleados`.
// Mantén los nombres de las propiedades iguales a las columnas de la BD
// para que la correspondencia con Prisma sea clara.
export interface Empleado {
  id_empleado: number;
  nombre_completo: string;
  dui: string;
  nit: string;
  id_cargo: number;
  id_rol: number;
  activo: boolean;
  fecha_registro: Date;
}

// Alias para respuestas desde el servicio/repo
export type EmpleadoResponse = Empleado;
