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
    { id: 20, name: 'PROYECTO_DELETE', description: 'Permiso para cancelar proyectos' },
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

  const alertasPermissions: PermissionType[] = [
    {
      id: 32,
      name: 'ALERTA_CREATE',
      description: 'Crear alertas para proyectos asignados',
    },
    {
      id: 33,
      name: 'ALERTA_READ',
      description: 'Consultar la bandeja personal de alertas',
    },
    {
      id: 34,
      name: 'ALERTA_UPDATE',
      description: 'Marcar alertas personales como atendidas',
    },
    {
      id: 35,
      name: 'ALERTA_CONFIGURE',
      description: 'Administrar reglas automáticas de alertas',
    },
  ];

  // prettier-ignore
  const inventarioMaterialesPermissions: PermissionType[] = [
    { id: 29, name: 'INVENTARIO_MATERIAL_READ', description: 'Permiso para consultar existencias y movimientos de materiales' },
    { id: 30, name: 'INVENTARIO_MATERIAL_ENTRY', description: 'Permiso para registrar entradas de materiales' },
    { id: 31, name: 'INVENTARIO_MATERIAL_EXIT', description: 'Permiso para registrar salidas de materiales' },
    { id: 43, name: 'CONSUMO_MATERIAL_READ', description: 'Permiso para consultar consumos y mermas de materiales' },
    { id: 44, name: 'CONSUMO_MATERIAL_CREATE', description: 'Permiso para registrar y corregir consumos y mermas de materiales' },
  ];

  // prettier-ignore
  const reportesDefectoPermissions: PermissionType[] = [
    { id: 45, name: 'HERRAMIENTA_DEFECTO_READ', description: 'Permiso para consultar reportes de herramientas defectuosas' },
    { id: 46, name: 'HERRAMIENTA_DEFECTO_CREATE', description: 'Permiso para reportar herramientas defectuosas' },
  ];

  // prettier-ignore
  const reportesConsumoPermissions: PermissionType[] = [
    { id: 47, name: 'CONSUMO_DESVIACION_READ', description: 'Permiso para consultar desviaciones de consumo de materiales' },
    { id: 48, name: 'CONSUMO_REPORTE_PDF', description: 'Permiso para descargar el PDF de consumos por proyecto y periodo' },
  ];

  // prettier-ignore
  const actividadesDiariasPermissions: PermissionType[] = [
    { id: 36, name: 'ACTIVIDAD_CREATE', description: 'Permiso para registrar actividades diarias' },
    { id: 37, name: 'ACTIVIDAD_READ', description: 'Permiso para consultar actividades diarias' },
    { id: 38, name: 'ACTIVIDAD_UPDATE', description: 'Permiso para editar actividades diarias' },
  ];

  // prettier-ignore
  const incidenciasPermissions: PermissionType[] = [
    { id: 39, name: 'INCIDENCIA_CREATE', description: 'Permiso para registrar incidencias en obra' },
    { id: 40, name: 'INCIDENCIA_READ', description: 'Permiso para consultar incidencias en obra' },
    { id: 41, name: 'INCIDENCIA_UPDATE', description: 'Permiso para editar incidencias y cambiar su estado' },
    { id: 42, name: 'INCIDENCIA_DELETE', description: 'Permiso para eliminar incidencias en obra' },
  ];

  const permissions: PermissionType[] = [
    ...userPermissions,
    ...empleadosPermissions,
    ...cargoEmpleadosPermissions,
    ...cotizacionesPermissions,
    ...proyectoPermissions,
    ...rolePermissions,
    ...herramientasPermissions,
    ...alertasPermissions,
    ...inventarioMaterialesPermissions,
    ...actividadesDiariasPermissions,
    ...incidenciasPermissions,
    ...reportesDefectoPermissions,
    ...reportesConsumoPermissions,
  ];

  const permisosExistentes = await prisma.permission.findMany({
    select: { id: true, name: true },
  });
  const permisosPorNombre = new Map<string, number>();
  for (const permiso of permisosExistentes) {
    if (permisosPorNombre.has(permiso.name)) {
      throw new Error(`Permiso duplicado por nombre: ${permiso.name}.`);
    }
    permisosPorNombre.set(permiso.name, permiso.id);
  }

  // Conservar el ID real de cada permiso ya asignado a usuarios o roles.
  // Las bases anteriores pueden tener otros permisos en los IDs sugeridos.
  const idsOcupados = new Set(permisosExistentes.map(({ id }) => id));
  let siguienteId =
    Math.max(0, ...idsOcupados, ...permissions.map(({ id }) => id)) + 1;
  for (const permiso of permissions) {
    const idExistente = permisosPorNombre.get(permiso.name);
    if (idExistente !== undefined) {
      permiso.id = idExistente;
    } else if (idsOcupados.has(permiso.id)) {
      permiso.id = siguienteId++;
    }
    idsOcupados.add(permiso.id);
  }

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
      permissionIds: [
        ...empleadosPermissions,
        ...herramientasPermissions,
        ...alertasPermissions.filter((p) =>
          ['ALERTA_CREATE', 'ALERTA_READ', 'ALERTA_UPDATE'].includes(p.name),
        ),
        ...actividadesDiariasPermissions,
        ...incidenciasPermissions,
        ...reportesDefectoPermissions,
        ...reportesConsumoPermissions.filter(
          (p) => p.name === 'CONSUMO_DESVIACION_READ',
        ),
      ].map((p) => p.id),
      description: 'Jefe de proyecto',
    },
    {
      id: 3,
      name: 'Técnico',
      permissionIds: [
        ...alertasPermissions.filter((p) =>
          ['ALERTA_READ', 'ALERTA_UPDATE'].includes(p.name),
        ),
        ...reportesDefectoPermissions,
      ].map((p) => p.id),
      description: 'Técnico',
    },
  ];

  const rolesPorId = new Map(roles.map(({ id, name }) => [id, name]));
  const rolesPorNombre = new Map(roles.map(({ id, name }) => [name, id]));
  const rolesExistentes = await prisma.role.findMany({
    select: { id: true, name: true },
  });
  for (const role of rolesExistentes) {
    const nombreEsperado = rolesPorId.get(role.id);
    const idEsperado = rolesPorNombre.get(role.name);
    if (
      (nombreEsperado && nombreEsperado !== role.name) ||
      (idEsperado && idEsperado !== role.id)
    ) {
      throw new Error(`Conflicto de rol existente: ${role.id} (${role.name}).`);
    }
  }

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

  for (const { permissionIds, ...role } of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        description: role.description,
        updatedAt: new Date(),
      },
      create: role,
    });

    if (role.id === 3) {
      await prisma.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionId: {
            in: actividadesDiariasPermissions.map((p) => p.id),
          },
        },
      });
    }

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
