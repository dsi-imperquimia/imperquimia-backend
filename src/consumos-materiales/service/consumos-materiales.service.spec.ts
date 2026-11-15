import { ClasificacionConsumoMaterial, Prisma } from '@gen/prisma/client';
import { ConsumoOperacionError } from '../repository/consumos-materiales.repository';
import { ConsumosMaterialesService } from './consumos-materiales.service';
import { PdfConsumosService } from './pdf-consumos.service';

const uuid = '00000000-0000-4000-8000-000000000001';

function setup() {
  const repo = {
    findProyecto: jest
      .fn()
      .mockResolvedValue({ id: 4, nombre: 'Obra', estado: 'ACTIVO' }),
    usuarioPuedeOperarProyecto: jest.fn().mockResolvedValue(true),
    findConsumoByKey: jest.fn().mockResolvedValue(null),
    findConsumoById: jest.fn(),
    registrar: jest.fn().mockResolvedValue({
      consumo: { id: 1 },
      saldoActual: new Prisma.Decimal(2),
    }),
    revertir: jest.fn(),
    finalizarProyecto: jest.fn(),
    findConsumos: jest.fn().mockResolvedValue([]),
    findResumenData: jest.fn().mockResolvedValue({
      detalles: [],
      existencias: [],
      movimientos: [],
      consumos: [],
    }),
    findDatosDesviaciones: jest
      .fn()
      .mockResolvedValue({ detalles: [], consumos: [] }),
    sincronizarDesviaciones: jest.fn().mockResolvedValue([]),
    findDatosReporte: jest.fn(),
  };
  return {
    repo,
    service: new ConsumosMaterialesService(
      repo as any,
      new PdfConsumosService(),
    ),
  };
}

describe('ConsumosMaterialesService', () => {
  it('registra consumo productivo entero en el proyecto autorizado', async () => {
    const { repo, service } = setup();
    const result = await service.registrar(
      {
        claveOperacion: uuid,
        proyectoId: 4,
        materialId: 8,
        cantidad: 2,
        clasificacion: ClasificacionConsumoMaterial.PRODUCCION,
        fechaJornada: '2026-11-12',
      },
      2,
    );

    expect(result.repetido).toBe(false);
    expect(repo.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        proyectoId: 4,
        materialId: 8,
        cantidad: expect.any(Prisma.Decimal),
      }),
      2,
    );
  });

  it('rechaza consumos con cantidades decimales', async () => {
    const { repo, service } = setup();

    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 4,
          materialId: 8,
          cantidad: 1.5,
          clasificacion: ClasificacionConsumoMaterial.PRODUCCION,
          fechaJornada: '2026-11-12',
        },
        2,
      ),
    ).rejects.toMatchObject({
      status: 400,
      message: 'La cantidad debe ser un entero positivo.',
    });
    expect(repo.findProyecto).not.toHaveBeenCalled();
    expect(repo.registrar).not.toHaveBeenCalled();
  });

  it('exige motivo para una merma', async () => {
    const { repo, service } = setup();
    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 4,
          materialId: 8,
          cantidad: 1,
          clasificacion: ClasificacionConsumoMaterial.PERDIDA,
          fechaJornada: '2026-11-12',
        },
        2,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.registrar).not.toHaveBeenCalled();
  });

  it('explica el saldo vigente cuando el material cambió antes de guardar', async () => {
    const { repo, service } = setup();
    repo.registrar.mockRejectedValue(
      new ConsumoOperacionError('SALDO_INSUFICIENTE', {
        cantidadDisponible: '0.5',
      }),
    );
    await expect(
      service.registrar(
        {
          claveOperacion: uuid,
          proyectoId: 4,
          materialId: 8,
          cantidad: 1,
          clasificacion: ClasificacionConsumoMaterial.PRODUCCION,
          fechaJornada: '2026-11-12',
        },
        2,
      ),
    ).rejects.toMatchObject({
      status: 409,
      message:
        'La cantidad supera el saldo disponible del proyecto. Actualmente hay 0.5 unidades disponibles.',
    });
  });

  it('mantiene consumo acumulado separado del saldo actual', async () => {
    const { repo, service } = setup();
    const material = {
      id: 8,
      codigo: 'MAT-8',
      nombre: 'Sellador',
      unidad: 'galón',
    };
    repo.findResumenData.mockResolvedValue({
      detalles: [],
      existencias: [
        { materialId: 8, cantidad: new Prisma.Decimal(0), material },
      ],
      movimientos: [
        {
          materialId: 8,
          cantidad: new Prisma.Decimal(4),
          motivo: 'USO_PROYECTO',
          material,
        },
        {
          materialId: 8,
          cantidad: new Prisma.Decimal(2),
          motivo: 'DEVOLUCION_PROYECTO',
          material,
        },
        {
          materialId: 8,
          cantidad: new Prisma.Decimal(4),
          motivo: 'USO_PROYECTO',
          material,
        },
      ],
      consumos: [
        {
          materialId: 8,
          cantidad: new Prisma.Decimal(2),
          clasificacion: 'PRODUCCION',
          material,
        },
        {
          materialId: 8,
          cantidad: new Prisma.Decimal(4),
          clasificacion: 'PRODUCCION',
          material,
        },
      ],
    });

    const result = await service.findProyecto(4, 2);
    expect(result.resumen[0]).toMatchObject({
      entregado: '8',
      devuelto: '2',
      consumido: '6',
      existenciaActual: '0',
    });
  });

  it('bloquea a un usuario ajeno aunque conozca el id del proyecto', async () => {
    const { repo, service } = setup();
    repo.usuarioPuedeOperarProyecto.mockResolvedValue(false);
    await expect(service.findProyecto(4, 99)).rejects.toMatchObject({
      status: 403,
    });
    expect(repo.findResumenData).not.toHaveBeenCalled();
  });

  it('detecta solo el exceso acumulado sobre la cantidad presupuestada', async () => {
    const { repo, service } = setup();
    repo.findDatosDesviaciones.mockResolvedValue({
      detalles: [{ materialId: 8, cantidad: new Prisma.Decimal(4) }],
      consumos: [1, 1, 1, 3].map((cantidad, index) => ({
        id: index + 1,
        proyectoId: 4,
        materialId: 8,
        cantidad: new Prisma.Decimal(cantidad),
        fechaJornada: new Date(Date.UTC(2026, 10, 10 + index)),
        clasificacion: 'PRODUCCION',
      })),
    });
    repo.sincronizarDesviaciones.mockImplementation(
      async (_proyectoId: number, datos: unknown[]) => datos,
    );

    const result = await service.findDesviaciones(4, 2);

    expect(result).toHaveLength(1);
    expect(repo.sincronizarDesviaciones).toHaveBeenCalledWith(
      4,
      [
        expect.objectContaining({
          regla: 'EXCESO_COTIZADO',
          consumoId: 4,
          valorObservado: new Prisma.Decimal(6),
          valorReferencia: new Prisma.Decimal(4),
          factorUmbral: new Prisma.Decimal(1),
        }),
      ],
    );
  });

  it('no marca desviación cuando el consumo iguala lo presupuestado', async () => {
    const { repo, service } = setup();
    repo.findDatosDesviaciones.mockResolvedValue({
      detalles: [{ materialId: 8, cantidad: new Prisma.Decimal(4) }],
      consumos: [{
        id: 1,
        proyectoId: 4,
        materialId: 8,
        cantidad: new Prisma.Decimal(4),
        fechaJornada: new Date(Date.UTC(2026, 10, 10)),
        clasificacion: 'PRODUCCION',
      }],
    });
    repo.sincronizarDesviaciones.mockImplementation(
      async (_proyectoId: number, datos: unknown[]) => datos,
    );

    await expect(service.findDesviaciones(4, 2)).resolves.toEqual([]);
    expect(repo.sincronizarDesviaciones).toHaveBeenCalledWith(4, []);
  });

  it('genera un PDF agrupado separando uso y merma', async () => {
    const { repo, service } = setup();
    const material = {
      id: 8,
      codigo: 'MAT-8',
      nombre: 'Sellador',
      unidad: 'galón',
    };
    repo.findDatosReporte.mockResolvedValue({
      proyecto: { id: 4, nombre: 'Obra', ubicacion: 'San Salvador' },
      consumos: [
        {
          materialId: 8,
          cantidad: new Prisma.Decimal(2),
          clasificacion: 'PRODUCCION',
          fechaJornada: new Date(Date.UTC(2026, 10, 12)),
          material,
        },
        {
          materialId: 8,
          cantidad: new Prisma.Decimal(1),
          clasificacion: 'PERDIDA',
          fechaJornada: new Date(Date.UTC(2026, 10, 12)),
          material,
        },
      ],
    });

    const result = await service.generarReportePdf(4, {}, 2);

    expect(result.filename).toBe('consumos-obra.pdf');
    expect(result.buffer.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });
});
