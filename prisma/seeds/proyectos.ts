import { EstadoProyecto, Prisma, PrismaClient } from '@gen/prisma/client';

// Datos ficticios. Reejecutar conserva los proyectos existentes con estos IDs.
export async function seedProyectos(prisma: PrismaClient) {
  await prisma.$transaction(async (tx) => {
    const usuario = await tx.user.findFirst({ where: { deletedAt: null }, orderBy: { id: 'asc' } });
    const materiales = await tx.material.findMany({ where: { estado: true }, orderBy: { id: 'asc' }, take: 2 });
    if (!usuario || materiales.length < 2) throw new Error('Ejecuta primero los seeds de usuarios y materiales.');

    const ejemplos = [
      { id: 1, nombre: 'Obra demo - Inspeccion de techo', estado: EstadoProyecto.ACTIVO, phone: '70000001', email: null, conMateriales: false, conCotizacion: false },
      { id: 2, nombre: 'Obra demo - Impermeabilizacion de bodega', estado: EstadoProyecto.ACTIVO, phone: null, email: 'bodega@example.com', conMateriales: true, conCotizacion: false },
      { id: 3, nombre: 'Obra demo - Reparacion residencial', estado: EstadoProyecto.FINALIZADO, phone: '70000003', email: 'residencial@example.com', conMateriales: true, conCotizacion: false },
      { id: 4, nombre: 'Obra demo - Sellado de terraza', estado: EstadoProyecto.PAGADO, phone: '70000004', email: null, conMateriales: true, conCotizacion: false },
      { id: 5, nombre: 'Obra demo - Cubierta en garantia', estado: EstadoProyecto.GARANTIA, phone: null, email: 'cubierta@example.com', conMateriales: true, conCotizacion: false },
      { id: 6, nombre: 'Obra demo - Cotizacion aprobada', estado: EstadoProyecto.ACTIVO, phone: '70000006', email: 'cotizacion@example.com', conMateriales: true, conCotizacion: true },
    ];

    for (const ejemplo of ejemplos) {
      if (await tx.proyecto.findUnique({ where: { id: ejemplo.id } })) continue;
      const detalles = ejemplo.conMateriales ? materiales.map((material, index) => {
        const cantidad = new Prisma.Decimal(index + 2);
        const subTotal = cantidad.mul(material.costoUnitario).toDecimalPlaces(2);
        const totalIva = subTotal.mul('0.13').toDecimalPlaces(2);
        return { materialId: material.id, cantidad, unidad: material.unidad, costoUnitario: material.costoUnitario, subTotal, totalIva, total: subTotal.add(totalIva) };
      }) : [];
      const subTotal = detalles.reduce((acc, d) => acc.add(d.subTotal), new Prisma.Decimal(0));
      const totalIva = detalles.reduce((acc, d) => acc.add(d.totalIva), new Prisma.Decimal(0));
      const total = subTotal.add(totalIva);
      const cliente = `Cliente de prueba ${ejemplo.id}`;
      const descripcion = `Trabajo de demostracion: ${ejemplo.nombre}`;
      const cotizacion = ejemplo.conCotizacion ? await tx.cotizacion.create({ data: {
        descripcion, cliente, phone: ejemplo.phone!, email: ejemplo.email!, userId: usuario.id,
        estado: 'APROBADA', estadoCambiadoPorId: usuario.id, estadoCambiadoAt: new Date(),
        subTotal, totalIva, total, detalles: { create: detalles },
      } }) : null;
      await tx.proyecto.create({ data: {
        id: ejemplo.id, nombre: ejemplo.nombre, descripcion, cliente,
        phone: ejemplo.phone, email: ejemplo.email, ubicacion: 'San Salvador (ejemplo)',
        fechaInicio: new Date(ejemplo.estado === 'ACTIVO' ? '2026-09-14T00:00:00Z' : '2026-08-01T00:00:00Z'),
        fechaFin: new Date(ejemplo.estado === 'ACTIVO' ? '2026-10-14T00:00:00Z' : '2026-08-31T00:00:00Z'),
        estado: ejemplo.estado, creadoPorId: usuario.id, cotizacionId: cotizacion?.id,
        subTotal, totalIva, total, detalles: { create: detalles },
      } });
    }
    await tx.$executeRaw`SELECT setval(pg_get_serial_sequence('proy_proyectos', 'id'), COALESCE((SELECT MAX(id) FROM proy_proyectos), 0) + 1, false)`;
  });
  console.log('Seed de proyectos completado: 6 escenarios; registros existentes conservados.');
}
