import { Injectable } from '@nestjs/common';
import { mixinMethods } from '../../common/utils/mixin-methods';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CargoRepository {
  constructor(private readonly prisma: PrismaService) {
  }
  findFirst() {
    return this.prisma.cargo.findFirst();
  }

  findMany() {
    return this.prisma.cargo.findMany();
  }

    idfindUnique(id: number) {
      return this.prisma.cargo.findUnique({
        where: {
          id_cargo: id
        }
      });
    }

    create(data: { nombre_cargo: string }) {
      return this.prisma.cargo.create({
        data
      });
    }

    update(id: number, data: { nombre_cargo?: string }) {
      return this.prisma.cargo.update({
        where: {
          id_cargo: id
        },
        data
      });
    }

    delete(id: number) {
      return this.prisma.cargo.delete({
        where: {
          id_cargo: id
        }
      });
    }

}

