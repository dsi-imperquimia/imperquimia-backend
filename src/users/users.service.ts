import { Prisma } from '@gen/prisma/client';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './user.repository';

const userSelect = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  roleId: true,
  permissions: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

const userSelectRolePermission = {
  ...userSelect,
  role: {
    select: {
      id: true,
      name: true,
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
  },
} satisfies Prisma.UserSelect;

type UserResponse = Prisma.UserGetPayload<{
  select: typeof userSelect | typeof userSelectRolePermission;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly repo: UserRepository) {}

  private async assertEmailAvailable(email: string, excludeId?: number) {
    const taken = await this.repo.findFirst({
      where: {
        email,
        ...(excludeId !== undefined && { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });

    if (taken) {
      throw new ConflictException({
        message: {
          email: ['El correo electrónico ya está en uso'],
        },
        error: 'Conflict',
        statusCode: 409,
      });
    }
  }

  async create(createUserDto: CreateUserDto) {
    await this.assertEmailAvailable(createUserDto.email);

    const password = await bcrypt.hash(createUserDto.password, 12);

    return this.repo.create({
      data: {
        name: createUserDto.name,
        lastName: createUserDto.lastName,
        email: createUserDto.email,
        roleId: createUserDto.roleId,
        password,
      },
      select: userSelect,
    });
  }

  async findAll(): Promise<UserResponse[]> {
    return this.repo.findMany({
      select: userSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.repo.findUnique({
      where: { id },
      select: userSelectRolePermission,
    });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return {
      ...user,
      role: {
        ...user.role,
        permissions: user?.role?.permissions.map((rp) => rp.permission),
        permissionsIds: user?.role?.permissions.map((rp) => rp.permission.id),
      },
      permissionsIds: user?.permissions.map((p) => p.permissionId) || [],
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const data: Prisma.UserUncheckedUpdateInput = {};

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name;
    }

    if (updateUserDto.lastName !== undefined) {
      data.lastName = updateUserDto.lastName;
    }

    if (updateUserDto.email !== undefined) {
      await this.assertEmailAvailable(updateUserDto.email, id);
      data.email = updateUserDto.email;
    }

    if (updateUserDto.roleId !== undefined) {
      data.roleId = updateUserDto.roleId;
    }

    if (updateUserDto.password !== undefined) {
      data.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    if (
      updateUserDto.permissionsIds !== undefined &&
      updateUserDto.permissionsIds.length > 0
    ) {
      await this.repo.userPermission.deleteMany({
        where: { userId: id },
      });

      await this.repo.userPermission.createMany({
        data: updateUserDto.permissionsIds.map((permissionId) => ({
          userId: id,
          permissionId,
        })),
      });
    }

    const user = this.repo.update({
      where: { id },
      data,
      select: userSelectRolePermission,
    });

    return user;
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    await this.repo.update({
      where: { id },
      select: userSelect,
      data: {
        email: `${user.email}|deleted+${user.id}`,
        deletedAt: new Date(),
      },
    });
    await this.repo.delete({ where: { id } });
    return user;
  }
}
