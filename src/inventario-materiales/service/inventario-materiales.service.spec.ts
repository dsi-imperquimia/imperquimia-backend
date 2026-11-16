import { MotivoMovimientoMaterial, Prisma } from '@gen/prisma/client';
import { ConflictException } from '@nestjs/common';
import { InventarioOperacionError } from '../repository/inventario-materiales.repository';
import { InventarioMaterialesService } from './inventario-materiales.service';

const uuid = '00000000-0000-4000-8000-000000000001';
const uuid2 = '00000000-0000-4000-8000-000000000002';

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
      findMovimientosByKeys: jest.fn(),
      registrar: jest.fn(),
      registrarSalidasProyecto: jest.fn(),
      registrarDevolucionesProyecto: jest.fn(),
      findExistencias: jest.fn(),
      findMovimientos: jest.fn(),
    };
    return {
      repo,
      service: new InventarioMaterialesService(repo as any),
    };
  }

  it('registra una entrada externa con cantidad entera y usuario de sesión', async () => {
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

  it('rechaza cantidades con decimales', async () => {
    const { repo, service } = setup();

    await expect(
      service.registrarEntrada(
        {
          claveOperacion: uuid,
          materialId: 3,
          cantidad: 1.5,
          motivo: MotivoMovimientoMaterial.COMPRA,
        },
        9,
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: 'La cantidad debe ser un entero positivo.',
    });
    expect(repo.registrar).not.toHaveBeenCalled();
  });

  it('rechaza el motivo otro para entradas y salidas nuevas', async () => {
    const { repo, service } = setup();

    await expect(
      service.registrarEntrada(
        {
          claveOperacion: uuid,
          materialId: 3,
          cantidad: 1,
          motivo: MotivoMovimientoMaterial.OTRO,
          observacion: 'Ajuste',
        },
        9,
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.registrarSalida(
        {
          claveOperacion: uuid,
          materialId: 3,
          cantidad: 1,
          motivo: MotivoMovimientoMaterial.OTRO,
          observacion: 'Ajuste',
        },
        9,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.registrar).not.toHaveBeenCalled();
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
      new InventarioOperacionError('SALDO_INSUFICIENTE', {
        cantidadDisponible: '12.5',
      }),
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
      message:
        'La cantidad supera el saldo disponible en el origen. Actualmente hay 12.5 unidades disponibles.',
    });
  });

  it('rechaza movimientos de materiales desactivados', async () => {
    const { repo, service } = setup();
    repo.findMovimientoByKey.mockResolvedValue(null);
    repo.registrar.mockRejectedValue(
      new InventarioOperacionError('MATERIAL_INACTIVO'),
    );

    await expect(
      service.registrarEntrada(
        {
          claveOperacion: uuid,
          materialId: 3,
          cantidad: 1,
          motivo: MotivoMovimientoMaterial.COMPRA,
        },
        9,
      ),
    ).rejects.toMatchObject({
      status: 409,
      message: 'No se pueden registrar movimientos de un material desactivado.',
    });
  });

  it('rechaza fechas de calendario imposibles en el historial', () => {
    const { service } = setup();
    expect(() => service.findMovimientos({ desde: '2026-02-30' })).toThrow(
      'Fecha inválida.',
    );
  });

  it('registra varios materiales para un proyecto en una sola operación', async () => {
    const { repo, service } = setup();
    repo.findMovimientosByKeys.mockResolvedValue([]);
    repo.registrarSalidasProyecto.mockResolvedValue([
      movimiento({
        claveOperacion: uuid,
        tipo: 'TRASLADO',
        motivo: MotivoMovimientoMaterial.USO_PROYECTO,
      }),
      movimiento({
        claveOperacion: uuid2,
        materialId: 4,
        tipo: 'TRASLADO',
        motivo: MotivoMovimientoMaterial.USO_PROYECTO,
      }),
    ]);

    const result = await service.registrarSalidasProyecto(
      {
        proyectoId: 7,
        materiales: [
          { claveOperacion: uuid, materialId: 3, cantidad: 2 },
          { claveOperacion: uuid2, materialId: 4, cantidad: 5 },
        ],
        observacion: 'Entrega semanal',
      },
      9,
    );

    expect(result.repetido).toBe(false);
    expect(repo.registrarSalidasProyecto).toHaveBeenCalledWith(
      7,
      [
        expect.objectContaining({
          claveOperacion: uuid,
          materialId: 3,
          cantidad: expect.any(Prisma.Decimal),
        }),
        expect.objectContaining({
          claveOperacion: uuid2,
          materialId: 4,
          cantidad: expect.any(Prisma.Decimal),
        }),
      ],
      'Entrega semanal',
      9,
    );
  });

  it('rechaza materiales repetidos en un envío múltiple', async () => {
    const { repo, service } = setup();

    await expect(
      service.registrarSalidasProyecto(
        {
          proyectoId: 7,
          materiales: [
            { claveOperacion: uuid, materialId: 3, cantidad: 2 },
            { claveOperacion: uuid2, materialId: 3, cantidad: 1 },
          ],
        },
        9,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.registrarSalidasProyecto).not.toHaveBeenCalled();
  });

  it('devuelve varios materiales del proyecto en una sola operación', async () => {
    const { repo, service } = setup();
    repo.findMovimientosByKeys.mockResolvedValue([]);
    repo.registrarDevolucionesProyecto.mockResolvedValue([
      movimiento({
        claveOperacion: uuid,
        tipo: 'TRASLADO',
        motivo: MotivoMovimientoMaterial.DEVOLUCION_PROYECTO,
        origen: { proyectoId: 7 },
      }),
      movimiento({
        claveOperacion: uuid2,
        materialId: 4,
        tipo: 'TRASLADO',
        motivo: MotivoMovimientoMaterial.DEVOLUCION_PROYECTO,
        origen: { proyectoId: 7 },
      }),
    ]);

    const result = await service.registrarDevolucionesProyecto(
      {
        proyectoId: 7,
        materiales: [
          { claveOperacion: uuid, materialId: 3, cantidad: 2 },
          { claveOperacion: uuid2, materialId: 4, cantidad: 1 },
        ],
        observacion: 'Retorno semanal',
      },
      9,
    );

    expect(result.repetido).toBe(false);
    expect(repo.registrarDevolucionesProyecto).toHaveBeenCalledWith(
      7,
      [
        expect.objectContaining({
          claveOperacion: uuid,
          materialId: 3,
          cantidad: expect.any(Prisma.Decimal),
        }),
        expect.objectContaining({
          claveOperacion: uuid2,
          materialId: 4,
          cantidad: expect.any(Prisma.Decimal),
        }),
      ],
      'Retorno semanal',
      9,
    );
  });
});
