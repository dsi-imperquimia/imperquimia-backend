import { PrismaClient } from '@gen/prisma/client';

// Datos ficticios. Reejecutar conserva los cargos y empleados existentes con estos IDs.
export async function seedEmpleados(prisma: PrismaClient) {
  await prisma.$transaction(async (tx) => {
    const cargos = [
      { id: 1, nombre: 'Jefe de Proyecto' },
      { id: 2, nombre: 'Técnico de Campo' },
      { id: 3, nombre: 'Supervisor de Obra' },
      { id: 4, nombre: 'Administrativo' },
    ];
    for (const cargo of cargos) {
      if (await tx.cargo.findUnique({ where: { id: cargo.id } })) continue;
      await tx.cargo.create({ data: cargo });
    }
    await tx.$executeRaw`SELECT setval(pg_get_serial_sequence('mnt_cargos', 'id'), COALESCE((SELECT MAX(id) FROM mnt_cargos), 0) + 1, false)`;

    const porNombre = (nombre: string) =>
      cargos.find((c) => c.nombre === nombre)!.id;

    const empleados = [
      {
        id: 1,
        nombreCompleto: 'Carlos Alberto Martínez Rivas',
        dui: '04512378-8',
        nit: '0614-150390-101-2',
        cargoId: porNombre('Jefe de Proyecto'),
        activo: true,
      },
      {
        id: 2,
        nombreCompleto: 'María Fernanda López Hernández',
        dui: '08823456-0',
        nit: '0614-220492-102-3',
        cargoId: porNombre('Jefe de Proyecto'),
        activo: true,
      },
      {
        id: 3,
        nombreCompleto: 'José Antonio Pérez González',
        dui: '01194733-8',
        nit: '0614-050195-103-4',
        cargoId: porNombre('Técnico de Campo'),
        activo: true,
      },
      {
        id: 4,
        nombreCompleto: 'Ana Gabriela Escobar Ramírez',
        dui: '06654321-0',
        nit: '0614-310896-104-5',
        cargoId: porNombre('Técnico de Campo'),
        activo: true,
      },
      {
        id: 5,
        nombreCompleto: 'Luis Fernando Argueta Castro',
        dui: '09988776-6',
        nit: '0614-120793-105-6',
        cargoId: porNombre('Técnico de Campo'),
        activo: true,
      },
      {
        id: 6,
        nombreCompleto: 'Pedro Antonio Sánchez Flores',
        dui: '02233445-9',
        nit: '0614-280291-106-7',
        cargoId: porNombre('Supervisor de Obra'),
        activo: true,
      },
      {
        id: 7,
        nombreCompleto: 'Beatriz Alejandra Morán Castillo',
        dui: '07711223-4',
        nit: '0614-030698-107-8',
        cargoId: porNombre('Administrativo'),
        activo: true,
      },
      {
        id: 8,
        nombreCompleto: 'Roberto Carlos Vásquez Mejía',
        dui: '03344556-4',
        nit: '0614-170485-108-9',
        cargoId: porNombre('Técnico de Campo'),
        activo: false,
      },
    ];

    for (const empleado of empleados) {
      if (await tx.empleado.findUnique({ where: { id: empleado.id } }))
        continue;
      await tx.empleado.create({ data: empleado });
    }
    await tx.$executeRaw`SELECT setval(pg_get_serial_sequence('mnt_empleados', 'id'), COALESCE((SELECT MAX(id) FROM mnt_empleados), 0) + 1, false)`;
  });
  console.log(
    'Seed de empleados completado: 4 cargos y 8 empleados de ejemplo; registros existentes conservados.',
  );
}
