import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const db =
  process.env.RUN_HERRAMIENTAS_DB_TESTS === '1' ? describe : describe.skip;

db('Herramientas: lectura de proyectos asignados', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: number;
  let tecnicoId: number;
  let tecnicoSinEmpleadoId: number;
  let empleadoId: number;
  let cargoId: number;
  let proyectoAsignadoId: number;
  let proyectoAjenoId: number;
  let herramientaAsignadaId: number;
  let herramientaAjenaId: number;
  let marcaId: number;
  let tipoId: number;
  let jwt: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const sufijo = randomUUID();
    const cargo = await prisma.cargo.create({
      data: { nombre: `Cargo ${sufijo}` },
    });
    cargoId = cargo.id;
    const empleado = await prisma.empleado.create({
      data: {
        nombreCompleto: 'Técnico de prueba',
        dui: `${sufijo.slice(0, 9)}`,
        nit: sufijo,
        cargoId,
      },
    });
    empleadoId = empleado.id;
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        lastName: 'Prueba',
        email: `admin-${sufijo}@example.test`,
        password: 'no-login',
        roleId: 1,
      },
    });
    adminId = admin.id;
    const tecnico = await prisma.user.create({
      data: {
        name: 'Técnico',
        lastName: 'Prueba',
        email: `tecnico-${sufijo}@example.test`,
        password: 'no-login',
        roleId: 3,
        empleadoId,
      },
    });
    tecnicoId = tecnico.id;
    const tecnicoSinEmpleado = await prisma.user.create({
      data: {
        name: 'Sin',
        lastName: 'Empleado',
        email: `sin-empleado-${sufijo}@example.test`,
        password: 'no-login',
        roleId: 3,
      },
    });
    tecnicoSinEmpleadoId = tecnicoSinEmpleado.id;

    const proyectoAsignado = await prisma.proyecto.create({
      data: { nombre: `Asignado ${sufijo}`, creadoPorId: adminId },
    });
    proyectoAsignadoId = proyectoAsignado.id;
    const proyectoAjeno = await prisma.proyecto.create({
      data: { nombre: `Ajeno ${sufijo}`, creadoPorId: adminId },
    });
    proyectoAjenoId = proyectoAjeno.id;
    await prisma.proyectoEmpleado.create({
      data: { proyectoId: proyectoAsignadoId, empleadoId },
    });
    const marca = await prisma.marcaHerramienta.create({
      data: { nombre: `Marca ${sufijo}`, clave: sufijo },
    });
    marcaId = marca.id;
    const tipo = await prisma.tipoHerramienta.create({
      data: { nombre: `Tipo ${sufijo}` },
    });
    tipoId = tipo.id;
    const asignada = await prisma.herramienta.create({
      data: {
        codigoUnico: `ASIG-${sufijo}`,
        nombre: 'Herramienta asignada',
        marca: marca.nombre,
        marcaId,
        tipoId,
        proyectoId: proyectoAsignadoId,
        estado: 'EN_PROYECTO',
        ubicacionActual: 'PROYECTO',
      },
    });
    herramientaAsignadaId = asignada.id;
    const ajena = await prisma.herramienta.create({
      data: {
        codigoUnico: `AJENA-${sufijo}`,
        nombre: 'Herramienta ajena',
        marca: marca.nombre,
        marcaId,
        tipoId,
        proyectoId: proyectoAjenoId,
        estado: 'EN_PROYECTO',
        ubicacionActual: 'PROYECTO',
      },
    });
    herramientaAjenaId = ajena.id;
  });

  afterAll(async () => {
    if (prisma) {
      if (herramientaAsignadaId || herramientaAjenaId) {
        const herramientaIds = [
          herramientaAsignadaId,
          herramientaAjenaId,
        ].filter(Boolean);
        await prisma.reporteDefectoHerramienta.deleteMany({
          where: { herramientaId: { in: herramientaIds } },
        });
        await prisma.herramienta.deleteMany({
          where: { id: { in: herramientaIds } },
        });
      }
      if (proyectoAsignadoId)
        await prisma.proyectoEmpleado.deleteMany({
          where: { proyectoId: proyectoAsignadoId },
        });
      const proyectoIds = [proyectoAsignadoId, proyectoAjenoId].filter(Boolean);
      if (proyectoIds.length)
        await prisma.proyecto.deleteMany({
          where: { id: { in: proyectoIds } },
        });
      const userIds = [adminId, tecnicoId, tecnicoSinEmpleadoId].filter(
        Boolean,
      );
      if (userIds.length)
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      if (empleadoId)
        await prisma.empleado.delete({ where: { id: empleadoId } });
      if (cargoId) await prisma.cargo.delete({ where: { id: cargoId } });
      if (marcaId)
        await prisma.marcaHerramienta.delete({ where: { id: marcaId } });
      if (tipoId)
        await prisma.tipoHerramienta.delete({ where: { id: tipoId } });
    }
    await app?.close();
  });

  const get = (ruta: string, usuarioId: number) =>
    request(app.getHttpServer())
      .get(ruta)
      .set('Authorization', `Bearer ${jwt.sign({ sub: usuarioId })}`);

  it('permite lectura completa al administrador y solo lectura asignada al técnico', async () => {
    const admin = await get('/herramientas', adminId).expect(200);
    expect(admin.body.map((h: { id: number }) => h.id)).toEqual(
      expect.arrayContaining([herramientaAsignadaId, herramientaAjenaId]),
    );

    const tecnico = await get('/herramientas', tecnicoId).expect(200);
    expect(tecnico.body.map((h: { id: number }) => h.id)).toContain(
      herramientaAsignadaId,
    );
    expect(tecnico.body.map((h: { id: number }) => h.id)).not.toContain(
      herramientaAjenaId,
    );
    await get(`/herramientas/${herramientaAsignadaId}`, tecnicoId).expect(200);
    await get(`/herramientas/${herramientaAjenaId}`, tecnicoId).expect(404);
    await get(`/herramientas?proyectoId=${proyectoAjenoId}`, tecnicoId).expect(
      200,
      [],
    );
  });

  it('no da acceso a un técnico sin empleado y permite reportar la herramienta asignada', async () => {
    await get('/herramientas', tecnicoSinEmpleadoId).expect(200, []);
    await get(
      `/herramientas/${herramientaAsignadaId}`,
      tecnicoSinEmpleadoId,
    ).expect(404);
    await request(app.getHttpServer())
      .post(`/herramientas/${herramientaAsignadaId}/reportes-defecto`)
      .set('Authorization', `Bearer ${jwt.sign({ sub: tecnicoSinEmpleadoId })}`)
      .send({ observacion: 'No debería registrar este reporte' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/herramientas/${herramientaAsignadaId}/reportes-defecto`)
      .set('Authorization', `Bearer ${jwt.sign({ sub: tecnicoId })}`)
      .send({ observacion: 'Falla mecánica' })
      .expect(201);
  });

  it('retira el acceso cuando finaliza la asignación al proyecto', async () => {
    await prisma.proyectoEmpleado.update({
      where: {
        proyectoId_empleadoId: { proyectoId: proyectoAsignadoId, empleadoId },
      },
      data: { fechaRetiro: new Date() },
    });
    await get('/herramientas', tecnicoId).expect(200, []);
    await get(`/herramientas/${herramientaAsignadaId}`, tecnicoId).expect(404);
    await request(app.getHttpServer())
      .post(`/herramientas/${herramientaAsignadaId}/reportes-defecto`)
      .set('Authorization', `Bearer ${jwt.sign({ sub: tecnicoId })}`)
      .send({ observacion: 'Ya no está asignado' })
      .expect(403);
  });
});
