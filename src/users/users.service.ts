import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './user.repository';

const userSelect = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

type UserResponse = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const password = await bcrypt.hash(createUserDto.password, 12);

    // this.prisma.user.create({
    //   data: {
    //     name: createUserDto.name,
    //     lastName: createUserDto.lastName,
    //     email: createUserDto.email,
    //     password,
    //   },
    //   select: userSelect,
    // });

    return this.repo.create({
      data: {
        name: createUserDto.name,
        lastName: createUserDto.lastName,
        email: createUserDto.email,
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

  async findOne(id: number): Promise<UserResponse> {
    const user = await this.repo.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    await this.findOne(id);

    const data: Prisma.UserUpdateInput = {};

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name;
    }

    if (updateUserDto.lastName !== undefined) {
      data.lastName = updateUserDto.lastName;
    }

    if (updateUserDto.email !== undefined) {
      data.email = updateUserDto.email;
    }

    if (updateUserDto.password !== undefined) {
      data.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    return this.repo.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async remove(id: number): Promise<UserResponse> {
    const user = await this.findOne(id);
    await this.repo.update({
      where: { id },
      data: {
        email: `deleted+${user.id}|${user.email}`,
        deletedAt: new Date(),
      },
    });
    await this.repo.delete({ where: { id } });
    return user;
  }
}
