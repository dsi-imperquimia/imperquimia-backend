import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gen/prisma/client';
import { ProyectoRepository } from '../repository/proyectoRepository';
import { CreateProyectoDto } from '../dto/create-proyecto.dto';
import { UpdateProyectoDto } from '../dto/update-proyecto.dto';

@Injectable()
export class ProyectoService {
  constructor(private readonly repo: ProyectoRepository) {}

  private datosProyecto(dto: CreateProyectoDto) {
    if (!dto.nombre?.trim() || !dto.cliente?.trim()) throw new BadRequestException('Nombre y cliente son obligatorios.');
    if (!dto.phone?.trim() && !dto.email?.trim()) throw new BadRequestException('Ingresa al menos un teléfono o correo.');
    if (!dto.fechaInicio || !dto.fechaFin) throw new BadRequestException('Las fechas son obligatorias.');
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);
    if (!Number.isFinite(fechaInicio.getTime()) || !Number.isFinite(fechaFin.getTime()) || fechaFin < fechaInicio) throw new BadRequestException('Las fechas son obligatorias y el fin no puede ser anterior al inicio.');
    return { nombre: dto.nombre.trim(), cliente: dto.cliente.trim(), descripcion: dto.descripcion?.trim() || null, ubicacion: dto.ubicacion?.trim() || null, phone: dto.phone?.trim() || null, email: dto.email?.trim() || null, fechaInicio, fechaFin };
  }

  create(dto: CreateProyectoDto, userId: number) {
    return this.repo.create({
      ...this.datosProyecto(dto),
      creadoPorId: userId,
      cotizacionId: null,
    });
  }

  async update(id: number, dto: UpdateProyectoDto) {
    const actual = await this.findOne(id);
    const datos = this.datosProyecto({
      nombre: dto.nombre ?? actual.nombre,
      cliente: dto.cliente === undefined ? actual.cliente ?? '' : dto.cliente,
      descripcion: dto.descripcion === undefined ? actual.descripcion ?? '' : dto.descripcion,
      ubicacion: dto.ubicacion === undefined ? actual.ubicacion ?? '' : dto.ubicacion,
      phone: dto.phone === undefined ? actual.phone ?? '' : dto.phone,
      email: dto.email === undefined ? actual.email ?? '' : dto.email,
      fechaInicio: dto.fechaInicio === undefined ? actual.fechaInicio?.toISOString().slice(0, 10) ?? '' : dto.fechaInicio,
      fechaFin: dto.fechaFin === undefined ? actual.fechaFin?.toISOString().slice(0, 10) ?? '' : dto.fechaFin,
    });
    return this.repo.update(id, datos);
  }

  findAll() {
    return this.repo.findMany();
  }

  async findOne(id: number) {
    const proyecto = await this.repo.findUnique(id);
    if (!proyecto) {
      throw new NotFoundException(`Proyecto #${id} no encontrado`);
    }
    return proyecto;
  }

  async remove(id: number) {
    const proyecto = await this.findOne(id);

    if (proyecto.empleados.some((asignacion) => asignacion.fechaRetiro === null)) {
      throw new ConflictException('Retira los empleados asignados antes de eliminar el proyecto.');
    }

    if (proyecto.herramientas.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar el proyecto #${id} porque tiene ${proyecto.herramientas.length} herramienta(s) asignada(s)`,
      );
    }

    return this.repo.softDelete(id);
  }

  async asignarEmpleado(proyectoId: number, empleadoId: number) {
    await this.findOne(proyectoId);
    if (!(await this.repo.empleadoDisponible(empleadoId))) {
      throw new NotFoundException('Empleado no encontrado o inactivo.');
    }
    if (await this.repo.asignacionActiva(empleadoId)) {
      throw new ConflictException('El empleado ya tiene una asignación activa. Retíralo antes de asignarlo nuevamente.');
    }
    try {
      return await this.repo.asignarEmpleado(proyectoId, empleadoId);
    } catch (error) {
      // El indice protege tambien solicitudes concurrentes que superen la comprobacion anterior.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('El empleado ya tiene una asignación activa.');
      }
      throw error;
    }
  }

  async retirarEmpleado(proyectoId: number, empleadoId: number) {
    await this.findOne(proyectoId);
    const result = await this.repo.retirarEmpleado(proyectoId, empleadoId);
    if (!result.count) throw new NotFoundException('No existe una asignación activa de este empleado en el proyecto.');
    return { message: 'Empleado retirado del proyecto.' };
  }
}
