import { UserRepository } from '@/users/user.repository';
import { User } from '@gen/prisma/client';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private jwtService: JwtService,
  ) {}

  async signIn(
    email: string,
    pass: string,
  ): Promise<{
    access_token: string;
    user: Pick<User, 'id' | 'email' | 'name' | 'lastName'>;
  }> {
    const user = await this.userRepo.findFirst({
      where: { email },
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
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
      },
    };
  }
}
