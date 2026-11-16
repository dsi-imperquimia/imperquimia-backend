import { randomUUID } from 'node:crypto';
import { AreaMovimiento, EstadoHerramienta } from '@gen/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { HerramientaRepository } from '../src/herramientas/repository/herramientaRepository';
import { HerramientaService } from '../src/herramientas/service/herramienta.service';
import { MovimientoRepository } from '../src/movimientos/repository/movimientoRepository';
import { MovimientoService } from '../src/movimientos/service/movimiento.service';
import { seedUbicacionesHerramientas } from '../prisma/seeds/ubicacionesHerramientas';

const db =
  process.env.RUN_HERRAMIENTAS_DB_TESTS === '1' ? describe : describe.skip;

db('Herramientas y movimientos: integración PostgreSQL', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('valida el origen, conserva la ubicación y evita reportes simultáneos', async () => {
    const suffix = randomUUID();
    const marca = await prisma.marcaHerramienta.create({
      data: { nombre: `Marca ${suffix}`, clave: suffix },
    });
    const tipo = await prisma.tipoHerramienta.create({
      data: { nombre: `Tipo ${suffix}` },
    });
    const usuario = await prisma.user.create({
      data: {
        name: 'Prueba',
        lastName: 'Herramientas',
        email: `${suffix}@example.com`,
        password: 'no-login',
      },
    });
    const herramienta = await prisma.herramienta.create({
      data: {
        codigoUnico: suffix,
        nombre: 'Herramienta de regresión',
        marca: marca.nombre,
        marcaId: marca.id,
        tipoId: tipo.id,
      },
    });

    try {
      const herramientaRepo = new HerramientaRepository(prisma);
      const movimientoService = new MovimientoService(
        new MovimientoRepository(prisma),
        herramientaRepo,
      );
      const herramientaService = new HerramientaService(
        herramientaRepo,
        {} as never,
        {} as never,
      );

      await expect(
        movimientoService.create(
          {
            herramientaId: herramienta.id,
            origen: AreaMovimiento.PROYECTO,
            destino: AreaMovimiento.TALLER,
          },
          usuario.id,
        ),
      ).rejects.toMatchObject({ status: 409 });

      await movimientoService.create(
        {
          herramientaId: herramienta.id,
          origen: AreaMovimiento.BODEGA,
          destino: AreaMovimiento.TALLER,
        },
        usuario.id,
      );
      const trasladada = await prisma.herramienta.findUniqueOrThrow({
        where: { id: herramienta.id },
      });
      expect(trasladada.estado).toBe(EstadoHerramienta.MANTENIMIENTO);
      expect(trasladada.ubicacionActual).toBe(AreaMovimiento.TALLER);

      // Simula la columna recién agregada: el valor por defecto es BODEGA,
      // aunque el historial anterior indica que está en el taller.
      await prisma.herramienta.update({
        where: { id: herramienta.id },
        data: { ubicacionActual: AreaMovimiento.BODEGA },
      });
      await seedUbicacionesHerramientas(prisma);
      const reconciliada = await prisma.herramienta.findUniqueOrThrow({
        where: { id: herramienta.id },
      });
      expect(reconciliada.ubicacionActual).toBe(AreaMovimiento.TALLER);

      const resultados = await Promise.allSettled([
        herramientaService.reportarDefecto(
          herramienta.id,
          { observacion: 'Reporte simultáneo A' },
          usuario.id,
        ),
        herramientaService.reportarDefecto(
          herramienta.id,
          { observacion: 'Reporte simultáneo B' },
          usuario.id,
        ),
      ]);
      expect(
        resultados.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        resultados.filter(({ status }) => status === 'rejected'),
      ).toHaveLength(1);
      expect(
        await prisma.reporteDefectoHerramienta.count({
          where: {
            herramientaId: herramienta.id,
            estado: 'REQUIERE_REVISION',
          },
        }),
      ).toBe(1);
    } finally {
      await prisma.reporteDefectoHerramienta.deleteMany({
        where: { herramientaId: herramienta.id },
      });
      await prisma.movimientoHerramienta.deleteMany({
        where: { herramientaId: herramienta.id },
      });
      await prisma.herramienta.delete({ where: { id: herramienta.id } });
      await prisma.user.delete({ where: { id: usuario.id } });
      await prisma.tipoHerramienta.delete({ where: { id: tipo.id } });
      await prisma.marcaHerramienta.delete({ where: { id: marca.id } });
    }
  });

  it('reconcilia estado y ubicación de una herramienta antigua asignada directamente a un proyecto', async () => {
    const suffix = randomUUID();
    const proyecto = await prisma.proyecto.create({
      data: { nombre: `Proyecto ${suffix}` },
    });
    const marca = await prisma.marcaHerramienta.create({
      data: { nombre: `Marca ${suffix}`, clave: suffix },
    });
    const tipo = await prisma.tipoHerramienta.create({
      data: { nombre: `Tipo ${suffix}` },
    });
    const herramienta = await prisma.herramienta.create({
      data: {
        codigoUnico: suffix,
        nombre: 'Herramienta anterior a la migración',
        marca: marca.nombre,
        marcaId: marca.id,
        tipoId: tipo.id,
        proyectoId: proyecto.id,
        estado: EstadoHerramienta.DISPONIBLE,
      },
    });

    try {
      await seedUbicacionesHerramientas(prisma);
      const reconciliada = await prisma.herramienta.findUniqueOrThrow({
        where: { id: herramienta.id },
      });
      expect(reconciliada.ubicacionActual).toBe(AreaMovimiento.PROYECTO);
      expect(reconciliada.estado).toBe(EstadoHerramienta.EN_PROYECTO);
    } finally {
      await prisma.herramienta.delete({ where: { id: herramienta.id } });
      await prisma.tipoHerramienta.delete({ where: { id: tipo.id } });
      await prisma.marcaHerramienta.delete({ where: { id: marca.id } });
      await prisma.proyecto.delete({ where: { id: proyecto.id } });
    }
  });
});
