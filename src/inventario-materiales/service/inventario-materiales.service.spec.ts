import { MotivoMovimientoMaterial, Prisma } from '@gen/prisma/client';
import { ConflictException } from '@nestjs/common';
import { InventarioOperacionError } from '../repository/inventario-materiales.repository';
import { InventarioMaterialesService } from './inventario-materiales.service';

const uuid = '00000000-0000-4000-8000-000000000001';

function movimiento(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    claveOperacion: uuid,
    materialId: 3,
    cantidad: new Prisma.Decimal(5),
    tipo: 'ENTRADA',
    motivo: MotivoMovimientoMaterial.COMPRA,
    observacion: null,
    origen: null,
    destino: { proyectoId: null },
    ...overrides,
  } as any;
}

describe('InventarioMaterialesService', () => {
  function setup() {
    const repo = {
      findMovimientoByKey: jest.fn(),
      registrar: jest.fn(),
      findExistencias: jest.fn(),
      findMovimientos: jest.fn(),
    };
    return {
      repo,
      service: new InventarioMaterialesService(repo as any),
    };
  }

  it('registra una entrada externa con cantidad decimal y usuario de sesión', async () => {
    const { repo, service } = setup();
    repo.findMovimientoByKey.mockResolvedValue(null);
    repo.registrar.mockResolvedValue(movimiento());

    const result = await service.registrarEntrada(
      {
        claveOperacion: uuid,
        materialId: 3,
        cantidad: 5,
        motivo: MotivoMovimientoMaterial.COMPRA,
      },
      9,
    );

    expect(result.repetido).toBe(false);
    expect(repo.registrar).toHaveBeenCalledWith(
      'ENTRADA',
      expect.objectContaining({
        materialId: 3,
        cantidad: expect.any(Prisma.Decimal),
      }),
      9,
    );
  });

  it('rechaza una salida a proyecto cuando falta el proyecto', async () => {
    const { service } = setup();
    await expect(
      service.registrarSalida(
        {
          claveOperacion: uuid,
          materialId: 3,
          cantidad: 1,
          motivo: MotivoMovimientoMaterial.USO_PROYECTO,
        },
        9,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('devuelve el resultado anterior al reintentar la misma operación', async () => {
    const { repo, service } = setup();
    repo.findMovimientoByKey.mockResolvedValue(movimiento());

    const result = await service.registrarEntrada(
      {
        claveOperacion: uuid,
        materialId: 3,
        cantidad: 5,
        motivo: MotivoMovimientoMaterial.COMPRA,
      },
      9,
    );

    expect(result.repetido).toBe(true);
    expect(repo.registrar).not.toHaveBeenCalled();
  });

  it('rechaza una clave reutilizada con una cantidad diferente', async () => {
    const { repo, service } = setup();
    repo.findMovimientoByKey.mockResolvedValue(movimiento());

    await expect(
      service.registrarEntrada(
        {
          claveOperacion: uuid,
          materialId: 3,
          cantidad: 6,
          motivo: MotivoMovimientoMaterial.COMPRA,
        },
        9,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('convierte saldo insuficiente en conflicto sin ocultar la causa', async () => {
    const { repo, service } = setup();
    repo.findMovimientoByKey.mockResolvedValue(null);
    repo.registrar.mockRejectedValue(
      new InventarioOperacionError('SALDO_INSUFICIENTE'),
    );

    await expect(
      service.registrarSalida(
        {
          claveOperacion: uuid,
          materialId: 3,
          cantidad: 20,
          motivo: MotivoMovimientoMaterial.VENTA,
        },
        9,
      ),
    ).rejects.toMatchObject({
      status: 409,
      message: 'La cantidad supera el saldo disponible en el origen.',
    });
  });

  it('rechaza fechas de calendario imposibles en el historial', () => {
    const { service } = setup();
    expect(() => service.findMovimientos({ desde: '2026-02-30' })).toThrow(
      'Fecha inválida.',
    );
  });
});
