import { Injectable, NotFoundException } from '@nestjs/common';
import { CargoRepository } from '../repository/cargoRepository';
import { CreateCargoDto } from '../dto/createCargo';
import { UpdateCargoDto } from '../dto/updateCargo';
import { Cargo } from '@gen/prisma/client';

@Injectable()
export class CargoService {
  constructor(private readonly repo: CargoRepository) {}

  async create(createCargoDto: CreateCargoDto): Promise<Cargo> {
    return this.repo.create({ nombre: createCargoDto.nombre });
  }

  async findAll(): Promise<Cargo[]> {
    return this.repo.findMany();
  }

  async findOne(id: number): Promise<Cargo> {
    const cargo = await this.repo.findUnique(id);
    if (!cargo) {
      throw new NotFoundException(`Cargo #${id} not found`);
    }
    return cargo;
  }

  async update(id: number, updateCargoDto: UpdateCargoDto): Promise<Cargo> {
    await this.findOne(id);
    return this.repo.update(id, {
      nombre: updateCargoDto.nombre,
    });
  }

  async remove(id: number): Promise<Cargo> {
    const cargo = await this.findOne(id);
    await this.repo.delete(id);
    return cargo;
  }
}
