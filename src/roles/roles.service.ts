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

    return role;
  }

  async findAll() {
    return await this.repo.findMany({
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
  }

  async findOne(id: number) {
    return await this.repo.findUnique({
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

    return role;
  }

  async remove(id: number) {
    return await this.repo.delete({
      where: { id },
    });
  }
}
