import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@gen/prisma/client';
import { ProyectoRepository } from '../repository/proyectoRepository';
import {
  CreateProyectoDto,
  DetalleProyectoDto,
} from '../dto/create-proyecto.dto';
import { UpdateProyectoDto } from '../dto/update-proyecto.dto';

const MAX_IMPORTE = new Prisma.Decimal('99999999.99');

@Injectable()
export class ProyectoService {
  constructor(private readonly repo: ProyectoRepository) {}

  private datosProyecto(dto: CreateProyectoDto) {
    if (dto.phone?.trim() && !/^\d{8}$/.test(dto.phone.trim()))
      throw new BadRequestException(
        'El teléfono debe contener exactamente 8 dígitos.',
      );
    if (!dto.nombre?.trim() || !dto.cliente?.trim())
      throw new BadRequestException('Nombre y cliente son obligatorios.');
    if (!dto.phone?.trim() && !dto.email?.trim())
      throw new BadRequestException('Ingresa al menos un teléfono o correo.');
    if (!dto.fechaInicio || !dto.fechaFin)
      throw new BadRequestException('Las fechas son obligatorias.');
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);
    if (
      !Number.isFinite(fechaInicio.getTime()) ||
      !Number.isFinite(fechaFin.getTime()) ||
      fechaFin < fechaInicio
    )
      throw new BadRequestException(
        'Las fechas son obligatorias y el fin no puede ser anterior al inicio.',
      );
    return {
      nombre: dto.nombre.trim(),
      cliente: dto.cliente.trim(),
      descripcion: dto.descripcion?.trim() || null,
      ubicacion: dto.ubicacion?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      fechaInicio,
      fechaFin,
    };
  }

  private async presupuesto(
    detalles: DetalleProyectoDto[],
    existentes: {
      materialId: number;
      unidad: string;
      costoUnitario: Prisma.Decimal;
    }[] = [],
  ) {
    const ids = detalles.map((detalle) => detalle.materialId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'No puedes agregar el mismo material más de una vez.',
      );
    }

    const materiales = await this.repo.findMaterials(ids);
    const porId = new Map(
      materiales.map((material) => [material.id, material]),
    );
    const anteriores = new Map(
      existentes.map((detalle) => [detalle.materialId, detalle]),
    );
    const calculados = detalles.map((detalle) => {
      const material = porId.get(detalle.materialId);
      const anterior = anteriores.get(detalle.materialId);
      if (!material || (!material.estado && !anterior)) {
        throw new BadRequestException(
          `El material #${detalle.materialId} no está disponible.`,
        );
      }
      if (
        !Number.isFinite(detalle.cantidad) ||
        detalle.cantidad <= 0 ||
        !Number.isInteger(detalle.materialId) ||
        detalle.materialId <= 0
      ) {
        throw new BadRequestException(
          'Selecciona un material y una cantidad mayor que cero.',
        );
      }
      const cantidad = new Prisma.Decimal(detalle.cantidad);
      if (cantidad.decimalPlaces() > 2 || cantidad.greaterThan('99999999.99')) {
        throw new BadRequestException(
          'La cantidad admite hasta dos decimales.',
        );
      }
      const costoUnitario = anterior?.costoUnitario ?? material.costoUnitario;
      const subTotal = cantidad.mul(costoUnitario).toDecimalPlaces(2);
      const totalIva = subTotal.mul('0.13').toDecimalPlaces(2);
      const total = subTotal.add(totalIva);
      if (
        subTotal.greaterThan(MAX_IMPORTE) ||
        totalIva.greaterThan(MAX_IMPORTE) ||
        total.greaterThan(MAX_IMPORTE)
      ) {
        throw new BadRequestException(
          'El importe del material supera el máximo permitido.',
        );
      }
      return {
        materialId: detalle.materialId,
        cantidad,
        unidad: anterior?.unidad ?? material.unidad,
        costoUnitario,
        subTotal,
        totalIva,
        total,
      };
    });
    const sumar = (campo: 'subTotal' | 'totalIva' | 'total') =>
      calculados.reduce(
        (total, detalle) => total.add(detalle[campo]),
        new Prisma.Decimal(0),
      );
    const subTotal = sumar('subTotal');
    const totalIva = sumar('totalIva');
    const total = sumar('total');
    if (
      subTotal.greaterThan(MAX_IMPORTE) ||
      totalIva.greaterThan(MAX_IMPORTE) ||
      total.greaterThan(MAX_IMPORTE)
    ) {
      throw new BadRequestException(
        'El presupuesto supera el máximo permitido.',
      );
    }
    return {
      subTotal,
      totalIva,
      total,
      detalles: { create: calculados },
    };
  }

  async create(dto: CreateProyectoDto, userId: number) {
    const presupuesto = await this.presupuesto(dto.detalles ?? []);
    return this.repo.create({
      ...this.datosProyecto(dto),
      creadoPorId: userId,
      cotizacionId: null,
      ...presupuesto,
    });
  }

  async update(id: number, dto: UpdateProyectoDto) {
    const actual = await this.findOne(id);
    if (actual.estado === 'CANCELADO') {
      throw new ConflictException('No se puede editar un proyecto cancelado.');
    }
    const datos = this.datosProyecto({
      nombre: dto.nombre ?? actual.nombre,
      cliente: dto.cliente === undefined ? (actual.cliente ?? '') : dto.cliente,
      descripcion:
        dto.descripcion === undefined
          ? (actual.descripcion ?? '')
          : dto.descripcion,
      ubicacion:
        dto.ubicacion === undefined ? (actual.ubicacion ?? '') : dto.ubicacion,
      phone: dto.phone === undefined ? (actual.phone ?? '') : dto.phone,
      email: dto.email === undefined ? (actual.email ?? '') : dto.email,
      fechaInicio:
        dto.fechaInicio === undefined
          ? (actual.fechaInicio?.toISOString().slice(0, 10) ?? '')
          : dto.fechaInicio,
      fechaFin:
        dto.fechaFin === undefined
          ? (actual.fechaFin?.toISOString().slice(0, 10) ?? '')
          : dto.fechaFin,
    });
    if (dto.detalles === undefined) return this.repo.update(id, datos);
    if (dto.detalles === null)
      throw new BadRequestException(
        'Los materiales deben enviarse en un arreglo.',
      );
    const presupuesto = await this.presupuesto(dto.detalles, actual.detalles);
    return this.repo.update(id, {
      ...datos,
      subTotal: presupuesto.subTotal,
      totalIva: presupuesto.totalIva,
      total: presupuesto.total,
      detalles: { deleteMany: {}, create: presupuesto.detalles.create },
    });
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

  async cancelar(id: number) {
    const proyecto = await this.findOne(id);

    if (proyecto.estado === 'CANCELADO') {
      throw new ConflictException('El proyecto ya está cancelado.');
    }

    if (
      proyecto.empleados.some((asignacion) => asignacion.fechaRetiro === null)
    ) {
      throw new ConflictException(
        'Retira los empleados asignados antes de cancelar el proyecto.',
      );
    }

    if (proyecto.herramientas.length > 0) {
      throw new BadRequestException(
        `No se puede cancelar el proyecto #${id} porque tiene ${proyecto.herramientas.length} herramienta(s) asignada(s)`,
      );
    }

    return this.repo.cancelar(id);
  }

  async asignarEmpleado(proyectoId: number, empleadoId: number) {
    const proyecto = await this.findOne(proyectoId);
    if (proyecto.estado === 'CANCELADO') {
      throw new ConflictException(
        'No se puede asignar empleados a un proyecto cancelado.',
      );
    }
    if (!(await this.repo.empleadoDisponible(empleadoId))) {
      throw new NotFoundException('Empleado no encontrado o inactivo.');
    }
    if (await this.repo.asignacionActiva(empleadoId)) {
      throw new ConflictException(
        'El empleado ya tiene una asignación activa. Retíralo antes de asignarlo nuevamente.',
      );
    }
    try {
      return await this.repo.asignarEmpleado(proyectoId, empleadoId);
    } catch (error) {
      // El indice protege tambien solicitudes concurrentes que superen la comprobacion anterior.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El empleado ya tiene una asignación activa.',
        );
      }
      throw error;
    }
  }

  async retirarEmpleado(proyectoId: number, empleadoId: number) {
    await this.findOne(proyectoId);
    const result = await this.repo.retirarEmpleado(proyectoId, empleadoId);
    if (!result.count)
      throw new NotFoundException(
        'No existe una asignación activa de este empleado en el proyecto.',
      );
    return { message: 'Empleado retirado del proyecto.' };
  }
}
