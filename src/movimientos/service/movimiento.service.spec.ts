import { AreaMovimiento, EstadoHerramienta } from '@gen/prisma/client';
import { MovimientoService } from './movimiento.service';

function setup() {
  const repo = {
    createWithTransaction: jest.fn().mockResolvedValue({ id: 15 }),
    findProyectoAsignable: jest.fn(),
  };
  const herramientaRepo = {
    findUnique: jest.fn().mockResolvedValue({
      id: 7,
      estado: EstadoHerramienta.DISPONIBLE,
      ubicacionActual: AreaMovimiento.BODEGA,
    }),
  };
  const service = new MovimientoService(
    repo as never,
    herramientaRepo as never,
  );
  return { herramientaRepo, repo, service };
}

describe('MovimientoService', () => {
  it('rechaza un origen que no coincide con la ubicación actual', async () => {
    const { repo, service } = setup();

    await expect(
      service.create(
        {
          herramientaId: 7,
          origen: AreaMovimiento.PROYECTO,
          destino: AreaMovimiento.TALLER,
        },
        3,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(repo.createWithTransaction).not.toHaveBeenCalled();
  });

  it('registra el origen real y protege el estado leído', async () => {
    const { repo, service } = setup();

    await service.create(
      {
        herramientaId: 7,
        origen: AreaMovimiento.BODEGA,
        destino: AreaMovimiento.TALLER,
      },
      3,
    );

    expect(repo.createWithTransaction).toHaveBeenCalledWith({
      herramientaId: 7,
      usuarioId: 3,
      origen: AreaMovimiento.BODEGA,
      destino: AreaMovimiento.TALLER,
      proyectoDestinoId: null,
      estadoActual: EstadoHerramienta.DISPONIBLE,
      estadoHerramienta: EstadoHerramienta.MANTENIMIENTO,
      observaciones: undefined,
    });
  });

  it('informa un conflicto cuando otra operación cambia la herramienta', async () => {
    const { repo, service } = setup();
    repo.createWithTransaction.mockRejectedValueOnce(
      new Error('UBICACION_CAMBIO'),
    );

    await expect(
      service.create(
        {
          herramientaId: 7,
          origen: AreaMovimiento.BODEGA,
          destino: AreaMovimiento.TALLER,
        },
        3,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
