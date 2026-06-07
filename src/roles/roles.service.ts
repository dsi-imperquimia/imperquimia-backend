import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleRepository } from './repository/role.repository';

@Injectable()
export class RolesService {
  constructor(private readonly repo: RoleRepository) {}

  async create(createRoleDto: CreateRoleDto) {
    const role = await this.repo.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    await this.repo.rolePermission.createMany({
      data: createRoleDto.permissions.map((permissionId) => ({
        permissionId,
        roleId: role.id,
      })),
      skipDuplicates: true,
    });

    const roleWithPermissions = await this.repo.findUnique({
      where: { id: role.id },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!roleWithPermissions) return null;

    return {
      ...roleWithPermissions,
      permissions: roleWithPermissions.permissions.map((rp) => rp.permission),
      permissionsIds: roleWithPermissions.permissions.map(
        (rp) => rp.permission.id,
      ),
    };
  }

  async findAll() {
    const roles = await this.repo.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
      permissionsIds: role.permissions.map((rp) => rp.permission.id),
    }));
  }

  async findOne(id: number) {
    const role = await this.repo.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!role) return null;

    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
      permissionsIds: role.permissions.map((rp) => rp.permission.id),
    };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.repo.update({
      where: { id },
      data: {
        name: updateRoleDto.name,
        description: updateRoleDto.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (updateRoleDto.permissions) {
      await this.repo.rolePermission.deleteMany({
        where: { roleId: id },
      });

      await this.repo.rolePermission.createMany({
        data: updateRoleDto.permissions.map((permissionId) => ({
          permissionId,
          roleId: role.id,
        })),
        skipDuplicates: true,
      });
    }

    const roleWithPermissions = await this.repo.findUnique({
      where: { id: role.id },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: {
          select: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!roleWithPermissions) return null;

    return {
      ...roleWithPermissions,
      permissions: roleWithPermissions.permissions.map((rp) => rp.permission),
      permissionsIds: roleWithPermissions.permissions.map(
        (rp) => rp.permission.id,
      ),
    };
  }

  async remove(id: number) {
    return await this.repo.delete({
      where: { id },
    });
  }
}
