import { UserRepository } from '@/users/user.repository';
import { UsersService } from '@/users/users.service';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async me(userId: number) {
    try {
      return await this.usersService.findOne(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException();
      }
      throw error;
    }
  }

  async signIn(email: string, pass: string) {
    const user = await this.userRepo.findFirst({
      where: { email },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        password: true,
        roleId: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
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
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await bcrypt.compare(pass, user?.password ?? '');

    if (isPasswordValid === false) {
      throw new UnauthorizedException();
    }

    return {
      access_token: await this.jwtService.signAsync({
        sub: user.id,
        username: user.email,
      }),
      user: {
        ...user,
        password: undefined,
        role: {
          ...user.role,
          permissions: user?.role?.permissions.map((rp) => rp.permission),
          permissionsIds: user?.role?.permissions.map((rp) => rp.permission.id),
        },
        permissionsIds: user?.permissions.map((p) => p.permissionId) || [],
      },
    };
  }
}
