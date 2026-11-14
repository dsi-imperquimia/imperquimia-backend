import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@gen/prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validationExceptionFactory } from '@/common/pipes/validation-exception.factory';
import { CreateProyectoDto } from '../dto/create-proyecto.dto';
import { ProyectoRepository } from '../repository/proyectoRepository';
import { ProyectoService } from './proyecto.service';
import { MailService } from '@/common/mail/mail.service';

const base = {
  nombre: 'Obra',
  cliente: 'Cliente',
  phone: '70000000',
  fechaInicio: '2026-09-14',
  fechaFin: '2026-09-30',
};

function setup() {
  const repo = {
    findMaterials: jest.fn().mockResolvedValue([
      { id: 1, estado: true, unidad: 'bolsa', costoUnitario: new Prisma.Decimal(10) },
      { id: 2, estado: true, unidad: 'm³', costoUnitario: new Prisma.Decimal(5) },
    ]),
    create: jest.fn().mockImplementation(async (data: unknown) => data),
    update: jest.fn().mockImplementation(async (_id: number, data: unknown) => data),
    findUnique: jest.fn(),
    cancelar: jest.fn().mockResolvedValue({ id: 9, estado: 'CANCELADO', deletedAt: null }),
    findCorreosEmpleadosActivos: jest.fn().mockResolvedValue([]),
  };
  const mail = { enviar: jest.fn().mockResolvedValue(undefined) };
  return {
    repo,
    mail,
    service: new ProyectoService(
      repo as unknown as ProyectoRepository,
      mail as unknown as MailService,
    ),
  };
}

describe('ProyectoService: presupuesto de materiales', () => {
  it('rechaza teléfono inválido y conserva el índice de errores de materiales', async () => {
    const { repo, service } = setup();
    await expect(service.create({ ...base, phone: '7000-0000' }, 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();

    const dto = plainToInstance(CreateProyectoDto, {
      ...base,
      phone: '7000-0000',
      detalles: [{ materialId: 1, cantidad: 2 }, { materialId: 2, cantidad: 0 }],
    });
    const errors = await validate(dto);
    const response = validationExceptionFactory(errors).getResponse() as {
      message: Record<string, string[]>;
    };
    expect(response.message.phone).toBeDefined();
    expect(response.message['detalles.1.cantidad']).toBeDefined();
    expect(response.message.cantidad).toBeDefined();

    const soloCorreo = plainToInstance(CreateProyectoDto, {
      ...base,
      phone: '',
      email: 'cliente@example.com',
    });
    expect((await validate(soloCorreo)).some((error) => error.property === 'phone')).toBe(false);
  });

  it('calcula subtotal, IVA y total al crear', async () => {
    const { repo, service } = setup();
    await service.create({
      ...base,
      detalles: [{ materialId: 1, cantidad: 2 }, { materialId: 2, cantidad: 1.5 }],
    }, 7);
    const data = repo.create.mock.calls[0][0] as Prisma.ProyectoUncheckedCreateInput;
    expect(data.subTotal?.toString()).toBe('27.5');
    expect(data.totalIva?.toString()).toBe('3.58');
    expect(data.total?.toString()).toBe('31.08');
    expect(data.detalles?.create).toHaveLength(2);
  });

  it('rechaza duplicados y cantidades inválidas', async () => {
    const { service } = setup();
    await expect(service.create({
      ...base,
      detalles: [{ materialId: 1, cantidad: 1 }, { materialId: 1, cantidad: 2 }],
    }, 7)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({
      ...base,
      detalles: [{ materialId: 1, cantidad: 0 }],
    }, 7)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza importes que no caben en los totales de la base de datos', async () => {
    const { repo, service } = setup();
    repo.findMaterials.mockResolvedValueOnce([
      {
        id: 1,
        estado: true,
        unidad: 'bolsa',
        costoUnitario: new Prisma.Decimal('99999999.99'),
      },
    ]);
    await expect(
      service.create({ ...base, detalles: [{ materialId: 1, cantidad: 2 }] }, 7),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({
        ...base,
        detalles: [
          { materialId: 1, cantidad: 5500000 },
          { materialId: 2, cantidad: 11000000 },
        ],
      }, 7),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('conserva el precio presupuestado al editar y permite quitar todos', async () => {
    const { repo, service } = setup();
    repo.findUnique.mockResolvedValue({
      ...base,
      id: 9,
      fechaInicio: new Date('2026-09-14'),
      fechaFin: new Date('2026-09-30'),
      detalles: [{
        materialId: 1, unidad: 'bolsa', costoUnitario: new Prisma.Decimal(8),
      }],
    });
    await service.update(9, { detalles: [{ materialId: 1, cantidad: 3 }] });
    const actualizado = repo.update.mock.calls[0][1] as Prisma.ProyectoUpdateInput;
    expect(actualizado.total?.toString()).toBe('27.12');
    expect(actualizado.detalles?.create).toEqual([
      expect.objectContaining({ costoUnitario: new Prisma.Decimal(8) }),
    ]);
    await service.update(9, { detalles: [] });
    const vacio = repo.update.mock.calls[1][1] as Prisma.ProyectoUpdateInput;
    expect(vacio.total?.toString()).toBe('0');
    expect(vacio.detalles?.deleteMany).toEqual({});
  });
});

describe('ProyectoService: cancelación', () => {
  it('cambia el estado, guarda el motivo y conserva el proyecto', async () => {
    const { repo, service } = setup();
    repo.findUnique.mockResolvedValue({
      id: 9,
      nombre: 'Obra',
      estado: 'ACTIVO',
      empleados: [],
      herramientas: [],
    });
    await expect(service.cancelar(9, 'Cliente desistió')).resolves.toMatchObject({
      estado: 'CANCELADO',
      deletedAt: null,
    });
    expect(repo.cancelar).toHaveBeenCalledWith(9, 'Cliente desistió');
  });

  it('no exige retirar empleados o herramientas: en su lugar notifica a los asignados', async () => {
    const { repo, mail, service } = setup();
    repo.findUnique.mockResolvedValue({
      id: 9,
      nombre: 'Obra',
      estado: 'ACTIVO',
      empleados: [{ fechaRetiro: null }],
      herramientas: [{ id: 1 }],
    });
    repo.findCorreosEmpleadosActivos.mockResolvedValue([
      { empleado: { nombreCompleto: 'Ana', user: { email: 'ana@test.com' } } },
      { empleado: { nombreCompleto: 'Sin cuenta', user: null } },
    ]);
    await expect(
      service.cancelar(9, 'Cliente desistió'),
    ).resolves.toMatchObject({ estado: 'CANCELADO' });
    expect(repo.cancelar).toHaveBeenCalledWith(9, 'Cliente desistió');
    expect(mail.enviar).toHaveBeenCalledTimes(1);
    expect(mail.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ana@test.com' }),
    );
  });

  it('impide cancelar un proyecto ya cancelado', async () => {
    const { repo, service } = setup();
    repo.findUnique.mockResolvedValue({
      id: 9,
      nombre: 'Obra',
      estado: 'CANCELADO',
      empleados: [],
      herramientas: [],
    });
    await expect(service.cancelar(9, 'Motivo')).rejects.toMatchObject({
      status: 409,
    });
    expect(repo.cancelar).not.toHaveBeenCalled();
  });
});

describe('ProyectoService: cancelar desde la edición general', () => {
  it('exige motivo cuando el estado destino es CANCELADO', async () => {
    const { repo, service } = setup();
    repo.findUnique.mockResolvedValue({
      id: 9,
      nombre: 'Obra',
      estado: 'ACTIVO',
      empleados: [],
      herramientas: [],
      detalles: [],
    });
    await expect(
      service.update(9, { estado: 'CANCELADO' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('cancela, guarda el motivo y notifica igual que el flujo dedicado', async () => {
    const { repo, mail, service } = setup();
    repo.findUnique.mockResolvedValue({
      id: 9,
      nombre: 'Obra',
      cliente: 'Cliente',
      phone: '70000000',
      fechaInicio: new Date('2026-09-14'),
      fechaFin: new Date('2026-09-30'),
      estado: 'ACTIVO',
      empleados: [{ fechaRetiro: null }],
      herramientas: [{ id: 1 }],
      detalles: [],
    });
    repo.findCorreosEmpleadosActivos.mockResolvedValue([
      { empleado: { nombreCompleto: 'Ana', user: { email: 'ana@test.com' } } },
    ]);
    await service.update(9, { estado: 'CANCELADO', motivo: 'Fin de obra' });
    const actualizado = repo.update.mock.calls[0][1] as Record<string, unknown>;
    expect(actualizado.estado).toBe('CANCELADO');
    expect(actualizado.motivoCancelacion).toBe('Fin de obra');
    expect(mail.enviar).toHaveBeenCalledTimes(1);
  });
});
