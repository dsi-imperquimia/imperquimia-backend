import { AreaMovimiento, EstadoHerramienta } from '@gen/prisma/client';
import { HerramientaService } from './herramienta.service';

function setup(estado: EstadoHerramienta = EstadoHerramienta.EN_PROYECTO) {
  const herramienta = {
    id: 7,
    proyectoId: 4,
    estado,
    tipoId: 1,
    marcaId: 1,
    tipo: { nombre: 'Equipo' },
  };
  const repo = {
    findUnique: jest.fn().mockResolvedValue(herramienta),
    usuarioPuedeOperarHerramienta: jest.fn().mockResolvedValue(true),
    crearReporteDefecto: jest.fn().mockResolvedValue({
      id: 11,
      herramientaId: 7,
      proyectoId: 4,
      observacion: 'Motor pierde potencia',
      estado: 'REQUIERE_REVISION',
    }),
  };
  const service = new HerramientaService(
    repo as never,
    {} as never,
    {} as never,
  );
  return { repo, service };
}

describe('HerramientaService: reportes de defecto', () => {
  it('conserva el proyecto y registra la observación para revisión', async () => {
    const { repo, service } = setup();

    const result = await service.reportarDefecto(
      7,
      { observacion: '  Motor pierde potencia  ' },
      3,
    );

    expect(result.estado).toBe('REQUIERE_REVISION');
    expect(repo.crearReporteDefecto).toHaveBeenCalledWith({
      herramientaId: 7,
      observacion: 'Motor pierde potencia',
      reportadoPorId: 3,
    });
  });

  it('evita duplicar un reporte que sigue pendiente', async () => {
    const { repo, service } = setup(EstadoHerramienta.REQUIERE_REVISION);

    await expect(
      service.reportarDefecto(7, { observacion: 'Otro reporte' }, 3),
    ).rejects.toMatchObject({ status: 409 });
    expect(repo.crearReporteDefecto).not.toHaveBeenCalled();
  });
});

describe('HerramientaService: alta en proyecto', () => {
  it('crea una herramienta asignada con estado y ubicación de proyecto', async () => {
    const repo = {
      findProyectoAsignable: jest.fn().mockResolvedValue({ id: 4 }),
      findMany: jest.fn().mockResolvedValue([]),
      findByCodigoUnico: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 7,
        tipo: { nombre: 'Taladro' },
      }),
    };
    const service = new HerramientaService(
      repo as never,
      { ensureSelectable: jest.fn() } as never,
      { ensureSelectable: jest.fn().mockResolvedValue({ id: 1, nombre: 'Marca' }) } as never,
    );

    await service.create({
      nombre: 'Taladro',
      marcaId: 1,
      tipoId: 1,
      proyectoId: 4,
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        proyectoId: 4,
        estado: EstadoHerramienta.EN_PROYECTO,
        ubicacionActual: AreaMovimiento.PROYECTO,
      }),
    );
  });
});
