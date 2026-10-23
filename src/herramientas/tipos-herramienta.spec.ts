import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TiposHerramientaService } from './service/tipos-herramienta.service';
import { HerramientaService } from './service/herramienta.service';
import { HerramientaRepository } from './repository/herramientaRepository';
import { MarcasHerramientaService } from './service/marcas-herramienta.service';

describe('Catálogo de tipos de herramienta', () => {
  const tipoHerramienta = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const service = new TiposHerramientaService({
    tipoHerramienta,
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('rechaza nombres de menos de 4 caracteres después de quitar espacios', async () => {
    await expect(service.create(' abc ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    tipoHerramienta.findUnique.mockResolvedValue({ id: 4, nombre: 'Manual' });
    await expect(service.update(4, ' xy ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tipoHerramienta.create).not.toHaveBeenCalled();
    expect(tipoHerramienta.update).not.toHaveBeenCalled();
  });

  it('rechaza un tipo desactivado para nuevas herramientas', async () => {
    tipoHerramienta.findUnique.mockResolvedValue({
      id: 4,
      nombre: 'Manual',
      activo: false,
    });
    await expect(service.ensureSelectable(4)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('conserva el registro al desactivarlo', async () => {
    tipoHerramienta.findUnique.mockResolvedValue({
      id: 4,
      nombre: 'Manual',
      activo: true,
    });
    tipoHerramienta.update.mockResolvedValue({
      id: 4,
      nombre: 'Manual',
      activo: false,
    });
    await service.setActive(4, false);
    expect(tipoHerramienta.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { activo: false },
    });
  });

  it('impide crear un nombre ya existente sin distinguir mayúsculas', async () => {
    tipoHerramienta.findFirst.mockResolvedValue({ id: 1, nombre: 'Eléctrica' });
    await expect(service.create(' eléctrica ')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tipoHerramienta.create).not.toHaveBeenCalled();
  });
});

describe('Herramientas con tipo catalogado', () => {
  it('mantiene el nombre de tipo en la respuesta del listado', async () => {
    const repo = {
      findMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: 7,
            nombre: 'Taladro',
            tipoId: 3,
            tipo: { id: 3, nombre: 'Eléctrica' },
          },
        ]),
    };
    const service = new HerramientaService(
      repo as unknown as HerramientaRepository,
      {} as TiposHerramientaService,
      {} as MarcasHerramientaService,
    );
    await expect(service.findAll()).resolves.toEqual([
      { id: 7, nombre: 'Taladro', tipoId: 3, tipo: 'Eléctrica' },
    ]);
  });
});
