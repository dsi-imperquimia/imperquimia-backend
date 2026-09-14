import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProyectoRepository } from '../src/proyectos/repository/proyectoRepository';
import { ProyectoService } from '../src/proyectos/service/proyecto.service';
import { CotizacionService } from '../src/cotizaciones/cotizaciones.service';
import { CreateProyectoDto } from '../src/proyectos/dto/create-proyecto.dto';

const db = process.env.RUN_PROYECTOS_DB_TESTS === '1' ? describe : describe.skip;
db('Proyectos: integracion PostgreSQL (rollback)', () => {
  let prisma: PrismaService;
  beforeAll(async () => { prisma = new PrismaService(); await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });
  it('valida DTO, CRUD, asignaciones y copia de cotizacion', async () => {
    const suffix = randomUUID();
    const rollback = new Error('ROLLBACK_PROYECTOS');
    const base = {nombre:'Proyecto prueba',cliente:'Cliente prueba',fechaInicio:'2026-09-14',fechaFin:'2026-09-30',phone:'70000000',email:''};
    expect(await validate(plainToInstance(CreateProyectoDto, base))).toHaveLength(0);
    expect((await validate(plainToInstance(CreateProyectoDto,{...base,email:'invalido'}))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(CreateProyectoDto,{...base,fechaInicio:'2026-02-30'}))).length).toBeGreaterThan(0);
    try { await prisma.$transaction(async tx => {
      const service = new ProyectoService(new ProyectoRepository(tx as unknown as PrismaService));
      const user = await tx.user.create({data:{name:'Prueba',lastName:'Proyecto',email:`${suffix}@example.com`,password:'no-login'}});
      const material = await tx.material.create({data:{nombre:`Material ${suffix}`,unidad:'unidad',costoUnitario:'10.00'}});
      const cargo = await tx.cargo.create({data:{nombre:`Cargo ${suffix}`}});
      const empleado = await tx.empleado.create({data:{nombreCompleto:'Empleado prueba',dui:suffix,nit:suffix,cargoId:cargo.id}});
      expect(()=>service.create({...base,phone:''},user.id)).toThrow();
      expect(()=>service.create({...base,fechaFin:'2026-09-01'},user.id)).toThrow();
      const p = await service.create(base,user.id);
      expect(p.cotizacionId).toBeNull(); expect(p.total.toString()).toBe('0'); expect(p.creadoPorId).toBe(user.id);
      expect((await service.findAll()).some(x=>x.id===p.id)).toBe(true);
      const editado = await service.update(p.id,{phone:'',email:'nuevo@example.com'});
      expect(editado.phone).toBeNull();
      await expect(service.update(p.id,{email:''})).rejects.toMatchObject({status:400});
      const segundo = await service.create({...base,nombre:'Segundo'},user.id);
      await service.asignarEmpleado(p.id,empleado.id);
      await expect(service.asignarEmpleado(segundo.id,empleado.id)).rejects.toMatchObject({status:409});
      await expect(service.remove(p.id)).rejects.toMatchObject({status:409});
      await service.retirarEmpleado(p.id,empleado.id);
      await service.asignarEmpleado(segundo.id,empleado.id);
      await service.remove(p.id); await expect(service.findOne(p.id)).rejects.toMatchObject({status:404});
      await tx.herramienta.create({data:{codigoUnico:suffix,nombre:'Herramienta prueba',marca:'Prueba',tipo:'Manual',proyectoId:segundo.id}});
      await service.retirarEmpleado(segundo.id,empleado.id);
      await expect(service.remove(segundo.id)).rejects.toMatchObject({status:400});
      const cot = await tx.cotizacion.create({data:{descripcion:'Cotizacion de prueba',cliente:'Cliente',phone:'70000000',email:'test@example.com',userId:user.id,subTotal:20,totalIva:2.6,total:22.6,detalles:{create:{materialId:material.id,cantidad:2,unidad:'unidad',costoUnitario:10,subTotal:20,totalIva:2.6,total:22.6}}}});
      // La transaccion externa engloba tambien las transacciones del servicio.
      const fixture = Object.assign(Object.create(tx), {$transaction: async (fn: (client: typeof tx)=>unknown)=>fn(tx)});
      const cotService = new CotizacionService(fixture as PrismaService);
      await tx.material.update({where:{id:material.id},data:{costoUnitario:99}});
      const aprobado = await cotService.aprobarCotizacion(cot.id,user.id);
      expect(aprobado.proyecto.cotizacionId).toBe(cot.id);
      expect(aprobado.proyecto.detalles[0].costoUnitario.toString()).toBe('10');
      expect(aprobado.proyecto.total.toString()).toBe('22.6');
      await expect(cotService.aprobarCotizacion(cot.id,user.id)).rejects.toMatchObject({status:400});
      expect((await service.findOne(aprobado.proyecto.id)).detalles).toHaveLength(1);
      throw rollback;
    },{timeout:30000}); } catch(error) { if(error!==rollback) throw error; }
    expect(await prisma.user.findUnique({where:{email:`${suffix}@example.com`}})).toBeNull();
  },35000);
});
