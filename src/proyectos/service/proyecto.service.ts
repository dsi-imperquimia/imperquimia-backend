import {
  correoCancelacionHtml,
  correoReasignacionHtml,
} from '@/common/mail/mail-templates';
import { MailService } from '@/common/mail/mail.service';
import { Prisma } from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProyectoDto,
  DetalleProyectoDto,
} from '../dto/create-proyecto.dto';
import { UpdateProyectoDto } from '../dto/update-proyecto.dto';
import { ProyectoRepository } from '../repository/proyectoRepository';

const MAX_IMPORTE = new Prisma.Decimal('99999999.99');

@Injectable()
export class ProyectoService {
  constructor(
    private readonly repo: ProyectoRepository,
    private readonly mail: MailService,
  ) {}

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
        !Number.isSafeInteger(detalle.cantidad) ||
        detalle.cantidad < 1 ||
        !Number.isInteger(detalle.materialId) ||
        detalle.materialId <= 0
      ) {
        throw new BadRequestException(
          'Selecciona un material y una cantidad entera mayor que cero.',
        );
      }
      const cantidad = new Prisma.Decimal(detalle.cantidad);
      if (cantidad.greaterThan('99999999')) {
        throw new BadRequestException(
          'La cantidad supera el máximo permitido.',
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
    if (
      dto.jefeProyectoId !== undefined &&
      !(await this.repo.empleadoDisponible(dto.jefeProyectoId))
    ) {
      throw new NotFoundException('Empleado no encontrado o inactivo.');
    }
    return this.repo.create({
      ...this.datosProyecto(dto),
      creadoPorId: userId,
      cotizacionId: null,
      jefeProyectoId: dto.jefeProyectoId ?? null,
      ...presupuesto,
    });
  }

  async update(id: number, dto: UpdateProyectoDto) {
    const actual = await this.findOne(id);
    if (actual.estado !== 'ACTIVO') {
      throw new ConflictException('Solo se puede editar un proyecto activo.');
    }
    const cancelando = dto.estado === 'CANCELADO';
    const motivo = dto.motivo?.trim();
    if (cancelando && !motivo) {
      throw new BadRequestException('Ingresa el motivo de la cancelación.');
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
    const camposEditables = {
      ...(dto.estado !== undefined && { estado: dto.estado }),
      ...(dto.tipoObra !== undefined && { tipoObra: dto.tipoObra }),
      ...(dto.presupuesto !== undefined && { presupuesto: dto.presupuesto }),
      ...(cancelando && { motivoCancelacion: motivo }),
    };

    let resultado;
    if (dto.detalles === undefined) {
      resultado = await this.repo.update(id, { ...datos, ...camposEditables });
    } else {
      if (dto.detalles === null)
        throw new BadRequestException(
          'Los materiales deben enviarse en un arreglo.',
        );
      const presupuestoMateriales = await this.presupuesto(
        dto.detalles,
        actual.detalles,
      );
      resultado = await this.repo.update(id, {
        ...datos,
        ...camposEditables,
        subTotal: presupuestoMateriales.subTotal,
        totalIva: presupuestoMateriales.totalIva,
        total: presupuestoMateriales.total,
        detalles: {
          deleteMany: {},
          create: presupuestoMateriales.detalles.create,
        },
      });
    }

    if (cancelando) {
      await this.notificarCancelacion(actual.nombre, motivo!, id);
    }
    return resultado;
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

  async cancelar(id: number, motivo: string) {
    const proyecto = await this.findOne(id);

    if (proyecto.estado !== 'ACTIVO') {
      throw new ConflictException('Solo se puede cancelar un proyecto activo.');
    }

    const cancelado = await this.repo.cancelar(id, motivo);
    await this.notificarCancelacion(proyecto.nombre, motivo, id);
    return cancelado;
  }

  // Avisa por correo a los empleados con asignación vigente al momento de
  // cancelar (GPRCIMPER-28). El envío no bloquea la cancelación si falla.
  private async notificarCancelacion(
    nombreProyecto: string,
    motivo: string,
    proyectoId: number,
  ) {
    const asignaciones =
      await this.repo.findCorreosEmpleadosActivos(proyectoId);
    const correos = asignaciones
      .map((asignacion) => asignacion.empleado.user?.email)
      .filter((email): email is string => Boolean(email));
    await Promise.all(
      correos.map((email) =>
        this.mail.enviar({
          to: email,
          subject: `Proyecto cancelado: ${nombreProyecto}`,
          text: `El proyecto "${nombreProyecto}" fue cancelado.\nMotivo: ${motivo}`,
          html: correoCancelacionHtml({ nombreProyecto, motivo }),
        }),
      ),
    );
  }

  async reasignarEmpleado(
    origenId: number,
    destinoId: number,
    empleadoId: number,
    usuarioId: number,
  ) {
    if (origenId === destinoId) {
      throw new BadRequestException(
        'El proyecto de origen y destino deben ser diferentes.',
      );
    }
    const [origen, destino] = await Promise.all([
      this.findOne(origenId),
      this.findOne(destinoId),
    ]);
    if (destino.estado === 'CANCELADO') {
      throw new ConflictException(
        'No se puede asignar empleados a un proyecto cancelado.',
      );
    }
    const asignacion = await this.repo.asignacionVigente(origenId, empleadoId);
    if (!asignacion) {
      throw new NotFoundException(
        'El empleado no tiene una asignación activa en el proyecto de origen.',
      );
    }
    await this.repo.reasignarEmpleado(origenId, destinoId, empleadoId);
    await this.notificarReasignacion(
      origen.id,
      origen.nombre,
      destino.nombre,
      asignacion.empleado.nombreCompleto,
      usuarioId,
    );
    return { message: 'Empleado reasignado correctamente.' };
  }

  // Avisa al jefe del proyecto de origen, por correo y por sistema, que
  // perdió un técnico por una reasignación urgente (GPRCIMPER-84). No
  // bloquea la reasignación si el proyecto no tiene jefe o si falla el aviso.
  private async notificarReasignacion(
    origenId: number,
    nombreOrigen: string,
    nombreDestino: string,
    nombreEmpleado: string,
    usuarioId: number,
  ) {
    const jefe = await this.repo.findJefeProyecto(origenId);
    const user = jefe?.jefeProyecto?.user;
    if (!user) return;
    const descripcion = `${nombreEmpleado} fue reasignado del proyecto "${nombreOrigen}" al proyecto "${nombreDestino}".`;
    await Promise.all([
      this.mail.enviar({
        to: user.email,
        subject: `Técnico reasignado: ${nombreOrigen}`,
        text: descripcion,
        html: correoReasignacionHtml({
          nombreEmpleado,
          nombreOrigen,
          nombreDestino,
        }),
      }),
      this.repo.crearNotificacionReasignacion({
        proyectoId: origenId,
        destinatarioId: user.id,
        creadaPorId: usuarioId,
        nombreProyecto: nombreOrigen,
        descripcion,
      }),
    ]);
  }

  async asignarEmpleado(proyectoId: number, empleadoId: number) {
    const proyecto = await this.findOne(proyectoId);
    if (proyecto.estado !== 'ACTIVO') {
      throw new ConflictException(
        'Solo se pueden asignar empleados a un proyecto activo.',
      );
    }
    if (!(await this.repo.empleadoDisponible(empleadoId))) {
      throw new NotFoundException('Empleado no encontrado o inactivo.');
    }
    return this.repo.asignarEmpleado(proyectoId, empleadoId);
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

  async asignarJefe(proyectoId: number, empleadoId: number) {
    const proyecto = await this.findOne(proyectoId);
    if (proyecto.estado !== 'ACTIVO') {
      throw new ConflictException(
        'Solo se puede asignar un jefe a un proyecto activo.',
      );
    }
    if (!(await this.repo.empleadoDisponible(empleadoId))) {
      throw new NotFoundException('Empleado no encontrado o inactivo.');
    }
    if (proyecto.jefeProyectoId === empleadoId) {
      throw new ConflictException(
        'Este empleado ya es el jefe de este proyecto.',
      );
    }
    return this.repo.asignarJefe(proyectoId, empleadoId);
  }

  async retirarJefe(proyectoId: number) {
    const proyecto = await this.findOne(proyectoId);
    if (!proyecto.jefeProyectoId) {
      throw new NotFoundException('El proyecto no tiene un jefe asignado.');
    }
    return this.repo.retirarJefe(proyectoId);
  }
}
