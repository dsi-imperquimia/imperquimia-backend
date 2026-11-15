import {
  AreaMovimiento,
  EstadoHerramienta,
  PrismaClient,
} from '@gen/prisma/client';

const TAMANO_LOTE = 500;

// La columna nueva recibe BODEGA por defecto. Recuperar la última ubicación
// conocida antes de permitir movimientos sobre herramientas ya existentes.
export async function seedUbicacionesHerramientas(prisma: PrismaClient) {
  let ultimoId: number | undefined;
  let actualizadas = 0;

  while (true) {
    const herramientas = await prisma.herramienta.findMany({
      take: TAMANO_LOTE,
      ...(ultimoId === undefined ? {} : { cursor: { id: ultimoId }, skip: 1 }),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        estado: true,
        proyectoId: true,
        ubicacionActual: true,
        movimientos: {
          take: 1,
          orderBy: [{ fechaMovimiento: 'desc' }, { id: 'desc' }],
          select: { destino: true },
        },
      },
    });

    if (herramientas.length === 0) break;

    for (const herramienta of herramientas) {
      const ubicacion =
        herramienta.movimientos[0]?.destino ??
        (herramienta.proyectoId !== null
          ? AreaMovimiento.PROYECTO
          : herramienta.estado === EstadoHerramienta.MANTENIMIENTO
            ? AreaMovimiento.TALLER
            : herramienta.estado === EstadoHerramienta.DESECHO
              ? AreaMovimiento.DESECHO
              : AreaMovimiento.BODEGA);
      const estado =
        herramienta.proyectoId !== null &&
        herramienta.estado === EstadoHerramienta.DISPONIBLE
          ? EstadoHerramienta.EN_PROYECTO
          : herramienta.estado;

      if (
        ubicacion !== herramienta.ubicacionActual ||
        estado !== herramienta.estado
      ) {
        const resultado = await prisma.herramienta.updateMany({
          where: {
            id: herramienta.id,
            ubicacionActual: herramienta.ubicacionActual,
            estado: herramienta.estado,
          },
          data: { ubicacionActual: ubicacion, estado },
        });
        actualizadas += resultado.count;
      }
    }

    ultimoId = herramientas[herramientas.length - 1].id;
  }

  console.log(`Ubicaciones de herramientas reconciliadas: ${actualizadas}.`);
}
