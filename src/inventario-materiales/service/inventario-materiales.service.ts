import { RegistrarMovimientoMaterialDto } from '../dto/registrar-movimiento-material.dto';
import {
  DireccionMovimiento,
  InventarioOperacionError,
  InventarioMaterialesRepository,
} from '../repository/inventario-materiales.repository';
import { MotivoMovimientoMaterial, Prisma } from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class InventarioMaterialesService {
  constructor(private readonly repo: InventarioMaterialesRepository) {}

  findExistencias(materialId?: number, proyectoId?: number) {
    return this.repo.findExistencias(materialId, proyectoId);
  }

  findMovimientos(query: Record<string, string | undefined>) {
    const materialId = this.parsePositiveInt(query.materialId, 'materialId');
    const proyectoId = this.parsePositiveInt(query.proyectoId, 'proyectoId');
    const desde = this.parseDate(query.desde, false);
    const hasta = this.parseDate(query.hasta, true);
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException(
        'La fecha desde no puede ser posterior a la fecha hasta.',
      );
    }
    return this.repo.findMovimientos({ materialId, proyectoId, desde, hasta });
  }

  registrarEntrada(dto: RegistrarMovimientoMaterialDto, usuarioId: number) {
    return this.registrar('ENTRADA', dto, usuarioId);
  }

  registrarSalida(dto: RegistrarMovimientoMaterialDto, usuarioId: number) {
    return this.registrar('SALIDA', dto, usuarioId);
  }

  private async registrar(
    direccion: DireccionMovimiento,
    dto: RegistrarMovimientoMaterialDto,
    usuarioId: number,
  ) {
    if (!Number.isInteger(dto.cantidad) || dto.cantidad < 1) {
      throw new BadRequestException('La cantidad debe ser un entero positivo.');
    }
    this.validarMotivo(direccion, dto);
    const existente = await this.repo.findMovimientoByKey(dto.claveOperacion);
    if (existente) return this.validarReintento(existente, direccion, dto);

    try {
      const resultado = await this.repo.registrar(
        direccion,
        {
          ...dto,
          cantidad: new Prisma.Decimal(dto.cantidad),
          observacion: dto.observacion?.trim() || undefined,
        },
        usuarioId,
      );
      return { movimiento: resultado, repetido: false };
    } catch (error) {
      if (error instanceof InventarioOperacionError) {
        this.throwRepositoryError(error.code, error.details);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrente = await this.repo.findMovimientoByKey(
          dto.claveOperacion,
        );
        if (concurrente)
          return this.validarReintento(concurrente, direccion, dto);
      }
      throw error;
    }
  }

  private validarMotivo(
    direccion: DireccionMovimiento,
    dto: RegistrarMovimientoMaterialDto,
  ) {
    const permitidos: MotivoMovimientoMaterial[] =
      direccion === 'ENTRADA'
        ? [
            MotivoMovimientoMaterial.COMPRA,
            MotivoMovimientoMaterial.DEVOLUCION_PROYECTO,
          ]
        : [
            MotivoMovimientoMaterial.USO_PROYECTO,
            MotivoMovimientoMaterial.VENTA,
          ];
    if (!permitidos.includes(dto.motivo)) {
      throw new BadRequestException(
        'El motivo no corresponde al tipo de movimiento.',
      );
    }
    const requiereProyecto =
      dto.motivo === MotivoMovimientoMaterial.DEVOLUCION_PROYECTO ||
      dto.motivo === MotivoMovimientoMaterial.USO_PROYECTO;
    if (requiereProyecto && !dto.proyectoId) {
      throw new BadRequestException({
        message: { proyectoId: ['Selecciona el proyecto del movimiento.'] },
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    if (!requiereProyecto && dto.proyectoId !== undefined) {
      throw new BadRequestException(
        'El proyecto solo aplica a movimientos entre bodega y proyecto.',
      );
    }
  }

  private validarReintento(
    movimiento: Awaited<
      ReturnType<InventarioMaterialesRepository['findMovimientoByKey']>
    > & {},
    direccion: DireccionMovimiento,
    dto: RegistrarMovimientoMaterialDto,
  ) {
    const proyectoId =
      movimiento.origen?.proyectoId ??
      movimiento.destino?.proyectoId ??
      undefined;
    const tipoEsperado =
      dto.motivo === MotivoMovimientoMaterial.USO_PROYECTO ||
      dto.motivo === MotivoMovimientoMaterial.DEVOLUCION_PROYECTO
        ? 'TRASLADO'
        : direccion;
    if (
      movimiento.materialId !== dto.materialId ||
      !movimiento.cantidad.equals(dto.cantidad) ||
      movimiento.motivo !== dto.motivo ||
      movimiento.tipo !== tipoEsperado ||
      proyectoId !== dto.proyectoId ||
      (movimiento.observacion ?? '') !== (dto.observacion?.trim() ?? '')
    ) {
      throw new ConflictException(
        'La clave de operación ya fue utilizada con datos diferentes.',
      );
    }
    return { movimiento, repetido: true };
  }

  private throwRepositoryError(
    error: string,
    details?: { cantidadDisponible?: string },
  ): never {
    if (error === 'MATERIAL_NO_ENCONTRADO') {
      throw new NotFoundException('Material no encontrado.');
    }
    if (error === 'MATERIAL_INACTIVO') {
      throw new ConflictException(
        'No se pueden registrar movimientos de un material desactivado.',
      );
    }
    if (error === 'PROYECTO_NO_ENCONTRADO') {
      throw new NotFoundException('Proyecto no encontrado.');
    }
    if (error === 'PROYECTO_NO_ACTIVO') {
      throw new ConflictException(
        'Solo se pueden registrar movimientos de materiales en proyectos activos.',
      );
    }
    if (error === 'SALDO_INSUFICIENTE') {
      throw new ConflictException(
        `La cantidad supera el saldo disponible en el origen. Actualmente hay ${details?.cantidadDisponible ?? '0'} unidades disponibles.`,
      );
    }
    throw new ServiceUnavailableException(
      'La bodega general no está configurada.',
    );
  }

  private parsePositiveInt(value: string | undefined, field: string) {
    if (value === undefined || value === '') return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${field} debe ser un entero positivo.`);
    }
    return parsed;
  }

  private parseDate(value: string | undefined, endOfDay: boolean) {
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(
        'Las fechas deben tener formato AAAA-MM-DD.',
      );
    }
    const [year, month, day] = value.split('-').map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (
      calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() !== month - 1 ||
      calendarDate.getUTCDate() !== day
    ) {
      throw new BadRequestException('Fecha inválida.');
    }
    const date = new Date(
      `${value}${endOfDay ? 'T23:59:59.999-06:00' : 'T00:00:00.000-06:00'}`,
    );
    if (!Number.isFinite(date.getTime()))
      throw new BadRequestException('Fecha inválida.');
    return date;
  }
}
