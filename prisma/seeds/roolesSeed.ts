import { Permission, PrismaClient, Role } from '@gen/prisma/client';

type PermissionType = Omit<Permission, 'createdAt' | 'updatedAt' | 'deletedAt'>;
type RoleType = Omit<Role, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  permissionIds: number[];
};

export async function seedRoles(prisma: PrismaClient) {
  /**
   * Permisos
   */
  const userPermissions: PermissionType[] = [
    { id: 1, name: 'USER_CREATE' },
    { id: 2, name: 'USER_READ' },
    { id: 3, name: 'USER_UPDATE' },
    { id: 4, name: 'USER_DELETE' },
  ];

  const empleadosPermissions: PermissionType[] = [
    { id: 5, name: 'EMPLEADO_CREATE' },
    { id: 6, name: 'EMPLEADO_READ' },
    { id: 7, name: 'EMPLEADO_UPDATE' },
    { id: 8, name: 'EMPLEADO_DELETE' },
  ];

  const cargoEmpleadosPermissions: PermissionType[] = [
    { id: 9, name: 'CARGO_EMPLEADO_CREATE' },
    { id: 10, name: 'CARGO_EMPLEADO_READ' },
    { id: 11, name: 'CARGO_EMPLEADO_UPDATE' },
    { id: 12, name: 'CARGO_EMPLEADO_DELETE' },
  ];

  const cotizacionesPermissions: PermissionType[] = [
    { id: 13, name: 'COTIZACIONES_CREATE' },
    { id: 14, name: 'COTIZACIONES_READ' },
    { id: 15, name: 'COTIZACIONES_UPDATE' },
    { id: 16, name: 'COTIZACIONES_DELETE' },
  ];

  const proyectoPermissions: PermissionType[] = [
    { id: 17, name: 'PROYECTO_CREATE' },
    { id: 18, name: 'PROYECTO_READ' },
    { id: 19, name: 'PROYECTO_UPDATE' },
    { id: 20, name: 'PROYECTO_DELETE' },
  ];

  const permissions: PermissionType[] = [
    ...userPermissions,
    ...empleadosPermissions,
    ...cargoEmpleadosPermissions,
    ...cotizacionesPermissions,
    ...proyectoPermissions,
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { id: permission.id },
      update: { updatedAt: new Date() },
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
    },
    {
      id: 2,
      name: 'Jefe de proyecto',
      permissionIds: empleadosPermissions.map((p) => p.id),
    },
    { id: 3, name: 'Técnico', permissionIds: [] },
  ];

  for (const { permissionIds, ...role } of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { updatedAt: new Date() },
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

  console.log(`Seeded ${roles.length} roles.`);
  console.table(roles, ['id', 'name']);
}
