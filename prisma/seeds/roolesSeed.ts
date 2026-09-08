import { Permission, PrismaClient, Role } from '@gen/prisma/client';

type PermissionType = Omit<Permission, 'createdAt' | 'updatedAt' | 'deletedAt'>;
type RoleType = Omit<Role, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  permissionIds: number[];
};

export async function seedRoles(prisma: PrismaClient) {
  /**
   * Permisos
   */
  // prettier-ignore
  const userPermissions: PermissionType[] = [
    { id: 1, name: 'USER_CREATE', description: 'Permiso para crear usuarios' },
    { id: 2, name: 'USER_READ', description: 'Permiso para leer usuarios' },
    { id: 3, name: 'USER_UPDATE', description: 'Permiso para actualizar usuarios' },
    { id: 4, name: 'USER_DELETE', description: 'Permiso para eliminar usuarios' },
  ];

  // prettier-ignore
  const empleadosPermissions: PermissionType[] = [
    { id: 5, name: 'EMPLEADO_CREATE', description: 'Permiso para crear empleados' },
    { id: 6, name: 'EMPLEADO_READ', description: 'Permiso para leer empleados' },
    { id: 7, name: 'EMPLEADO_UPDATE', description: 'Permiso para actualizar empleados' },
    { id: 8, name: 'EMPLEADO_DELETE', description: 'Permiso para eliminar empleados' },
  ];

  // prettier-ignore
  const cargoEmpleadosPermissions: PermissionType[] = [
    { id: 9, name: 'CARGO_EMPLEADO_CREATE', description: 'Permiso para crear cargos de empleados' },
    { id: 10, name: 'CARGO_EMPLEADO_READ', description: 'Permiso para leer cargos de empleados' },
    { id: 11, name: 'CARGO_EMPLEADO_UPDATE', description: 'Permiso para actualizar cargos de empleados' },
    { id: 12, name: 'CARGO_EMPLEADO_DELETE', description: 'Permiso para eliminar cargos de empleados' },
  ];

  // prettier-ignore
  const cotizacionesPermissions: PermissionType[] = [
    { id: 13, name: 'COTIZACIONES_CREATE', description: 'Permiso para crear cotizaciones' },
    { id: 14, name: 'COTIZACIONES_READ', description: 'Permiso para leer cotizaciones' },
    { id: 15, name: 'COTIZACIONES_UPDATE', description: 'Permiso para actualizar cotizaciones' },
    { id: 16, name: 'COTIZACIONES_DELETE', description: 'Permiso para eliminar cotizaciones' },
  ];

  // prettier-ignore
  const proyectoPermissions: PermissionType[] = [
    { id: 17, name: 'PROYECTO_CREATE', description: 'Permiso para crear proyectos' },
    { id: 18, name: 'PROYECTO_READ', description: 'Permiso para leer proyectos' },
    { id: 19, name: 'PROYECTO_UPDATE', description: 'Permiso para actualizar proyectos' },
    { id: 20, name: 'PROYECTO_DELETE', description: 'Permiso para eliminar proyectos' },
  ];

  // prettier-ignore
  const rolePermissions: PermissionType[] = [
    { id: 21, name: 'ROLE_CREATE', description: 'Permiso para crear roles' },
    { id: 22, name: 'ROLE_READ', description: 'Permiso para leer roles' },
    { id: 23, name: 'ROLE_UPDATE', description: 'Permiso para actualizar roles' },
    { id: 24, name: 'ROLE_DELETE', description: 'Permiso para eliminar roles' },
  ];

  // prettier-ignore
  const herramientasPermissions: PermissionType[] = [
    { id: 25, name: 'HERRAMIENTA_CREATE', description: 'Permiso para crear herramientas' },
    { id: 26, name: 'HERRAMIENTA_READ', description: 'Permiso para leer herramientas' },
    { id: 27, name: 'HERRAMIENTA_UPDATE', description: 'Permiso para actualizar herramientas' },
    { id: 28, name: 'HERRAMIENTA_DELETE', description: 'Permiso para eliminar herramientas' },
  ];

  const permissions: PermissionType[] = [
    ...userPermissions,
    ...empleadosPermissions,
    ...cargoEmpleadosPermissions,
    ...cotizacionesPermissions,
    ...proyectoPermissions,
    ...rolePermissions,
    ...herramientasPermissions,
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { id: permission.id },
      update: {
        description: permission.description,
        updatedAt: new Date(),
      },
      create: permission,
    });
  }

  console.log(`Seeded ${permissions.length} permissions.`);
  console.table(permissions, ['id', 'name']);

  /**
   * Roles
   */
  const roles: RoleType[] = [
    {
      id: 1,
      name: 'Administrador',
      permissionIds: permissions.map((p) => p.id),
      description: 'Administrador con todos los permisos',
    },
    {
      id: 2,
      name: 'Jefe de proyecto',
      permissionIds: [...empleadosPermissions, ...herramientasPermissions].map(
        (p) => p.id,
      ),
      description: 'Jefe de proyecto',
    },
    { id: 3, name: 'Técnico', permissionIds: [], description: 'Técnico' },
  ];

  for (const { permissionIds, ...role } of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        description: role.description,
        updatedAt: new Date(),
      },
      create: role,
    });

    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * Fix secuencia
   */
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"mnt_roles"', 'id'),
      COALESCE(MAX(id), 0) + 1,
      false
    ) FROM "mnt_roles";
  `);
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"mnt_permissions"', 'id'),
      COALESCE(MAX(id), 0) + 1,
      false
    ) FROM "mnt_permissions";
  `);

  console.log(`Seeded ${roles.length} roles.`);
  console.table(roles, ['id', 'name']);
}
