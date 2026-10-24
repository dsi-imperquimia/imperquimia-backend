import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';
import { MarcasHerramientaService } from './service/marcas-herramienta.service';
import { HerramientaService } from './service/herramienta.service';
import { HerramientaRepository } from './repository/herramientaRepository';
import { TiposHerramientaService } from './service/tipos-herramienta.service';

describe('Catálogo de marcas de herramientas', () => {
  const marcaHerramienta = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const herramienta = { updateMany: jest.fn() };
  const prisma = {
    marcaHerramienta,
    $transaction: jest.fn((operation) =>
      operation({ marcaHerramienta, herramienta }),
    ),
  };
  const service = new MarcasHerramientaService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rechaza nombres de menos de 4 caracteres después de quitar espacios', async () => {
    await expect(service.create(' abc ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    marcaHerramienta.findUnique.mockResolvedValue({ id: 4, nombre: 'Bosch' });
    await expect(service.update(4, ' xy ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(marcaHerramienta.create).not.toHaveBeenCalled();
    expect(marcaHerramienta.update).not.toHaveBeenCalled();
  });

  it('rechaza una marca desactivada para nuevas herramientas', async () => {
    marcaHerramienta.findUnique.mockResolvedValue({
      id: 4,
      nombre: 'Antigua',
      activo: false,
    });
    await expect(service.ensureSelectable(4)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('conserva las herramientas al desactivar una marca', async () => {
    marcaHerramienta.findUnique.mockResolvedValue({
      id: 4,
      nombre: 'Bosch',
      activo: true,
    });
    marcaHerramienta.update.mockResolvedValue({
      id: 4,
      nombre: 'Bosch',
      activo: false,
    });
    await service.setActive(4, false);
    expect(marcaHerramienta.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { activo: false },
    });
    expect(herramienta.updateMany).not.toHaveBeenCalled();
  });

  it('rechaza nombres duplicados sin distinguir mayúsculas', async () => {
    marcaHerramienta.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );
    await expect(service.create(' BOSCH ')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(marcaHerramienta.create).toHaveBeenCalledWith({
      data: { nombre: 'BOSCH', clave: 'bosch' },
    });
  });

  it('actualiza el nombre en las herramientas asociadas', async () => {
    marcaHerramienta.findUnique.mockResolvedValue({
      id: 4,
      nombre: 'Bosch',
      activo: true,
    });
    marcaHerramienta.update.mockResolvedValue({
      id: 4,
      nombre: 'Bosch Professional',
      activo: true,
    });
    await service.update(4, ' Bosch Professional ');
    expect(marcaHerramienta.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { nombre: 'Bosch Professional', clave: 'bosch professional' },
    });
    expect(herramienta.updateMany).toHaveBeenCalledWith({
      where: { marcaId: 4 },
      data: { marca: 'Bosch Professional' },
    });
  });
});

describe('Herramientas con marca catalogada', () => {
  it('acepta conservar una marca inactiva al editar sin cambiarla', async () => {
    const repo = {
      findUnique: jest.fn().mockResolvedValue({
        id: 2,
        marcaId: 4,
        marca: 'Antigua',
        tipo: { nombre: 'Manual' },
      }),
      update: jest.fn().mockResolvedValue({
        id: 2,
        marcaId: 4,
        marca: 'Antigua',
        tipo: { nombre: 'Manual' },
      }),
    };
    const marcas = { ensureSelectable: jest.fn() };
    const service = new HerramientaService(
      repo as unknown as HerramientaRepository,
      {} as TiposHerramientaService,
      marcas as unknown as MarcasHerramientaService,
    );
    await service.update(2, { nombre: 'Taladro nuevo', marcaId: 4 });
    expect(marcas.ensureSelectable).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(2, {
      nombre: 'Taladro nuevo',
      marcaId: 4,
    });
  });
});
