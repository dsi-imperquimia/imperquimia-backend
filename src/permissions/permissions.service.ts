import { Injectable } from '@nestjs/common';
import { PermissionRepository } from './repository/permission.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly repo: PermissionRepository) {}
  async findAll() {
    return this.repo.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }
}
