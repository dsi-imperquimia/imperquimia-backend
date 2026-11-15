import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClasificacionConsumoMaterial, Prisma } from '@gen/prisma/client';
import { RegistrarConsumoMaterialDto } from '../dto/registrar-consumo-material.dto';
import { RevertirConsumoMaterialDto } from '../dto/revertir-consumo-material.dto';
import { ReporteConsumosQueryDto } from '../dto/reporte-consumos-query.dto';
import {
  ConsumoOperacionError,
  ConsumosMaterialesRepository,
  DatosDesviacion,
} from '../repository/consumos-materiales.repository';
import { PdfConsumosService } from './pdf-consumos.service';

type MaterialResumen = {
  material: {
    id: number;
    codigo: string | null;
    nombre: string;
    unidad: string;
  };
  presupuestado: Prisma.Decimal;
  entregado: Prisma.Decimal;
  devuelto: Prisma.Decimal;
  produccion: Prisma.Decimal;
  merma: Prisma.Decimal;
  cierre: Prisma.Decimal;
  consumido: Prisma.Decimal;
  existenciaActual: Prisma.Decimal;
};

@Injectable()
export class ConsumosMaterialesService {
  constructor(
    private readonly repo: ConsumosMaterialesRepository,
    private readonly pdf: PdfConsumosService,
  ) {}

  async findProyecto(proyectoId: number, usuarioId: number) {
    await this.validarAmbito(proyectoId, usuarioId);
    const [proyecto, data, consumos] = await Promise.all([
      this.repo.findProyecto(proyectoId),
      this.repo.findResumenData(proyectoId),
      this.repo.findConsumos(proyectoId),
    ]);
    return {
      proyecto,
      resumen: this.construirResumen(data),
      consumos,
    };
  }

  async registrar(dto: RegistrarConsumoMaterialDto, usuarioId: number) {
    if (!Number.isInteger(dto.cantidad) || dto.cantidad < 1) {
      throw new BadRequestException('La cantidad debe ser un entero positivo.');
    }
    await this.validarAmbito(dto.proyectoId, usuarioId, true);
    if (dto.clasificacion === ClasificacionConsumoMaterial.CIERRE) {
      throw new BadRequestException(
        'El consumo de cierre solo se genera al finalizar el proyecto.',
      );
    }
    const motivo = dto.motivo?.trim() || undefined;
    if (dto.clasificacion === ClasificacionConsumoMaterial.PERDIDA && !motivo) {
      throw new BadRequestException({
        message: { motivo: ['Explica el motivo de la merma.'] },
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    const fechaJornada = this.parseFecha(dto.fechaJornada);
    const existente = await this.repo.findConsumoByKey(dto.claveOperacion);
    if (existente) return this.validarReintento(existente, dto, fechaJornada);

    try {
      const resultado = await this.repo.registrar(
        {
          claveOperacion: dto.claveOperacion,
          proyectoId: dto.proyectoId,
          materialId: dto.materialId,
          cantidad: new Prisma.Decimal(dto.cantidad),
          clasificacion: dto.clasificacion,
          fechaJornada,
          motivo,
          actividadReferencia: dto.actividadReferencia?.trim() || undefined,
          reporteReferencia: dto.reporteReferencia?.trim() || undefined,
        },
        usuarioId,
      );
      return { ...resultado, repetido: false };
    } catch (error) {
      if (error instanceof ConsumoOperacionError) {
        this.throwRepositoryError(error);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrente = await this.repo.findConsumoByKey(
          dto.claveOperacion,
        );
        if (concurrente)
          return this.validarReintento(concurrente, dto, fechaJornada);
      }
      throw error;
    }
  }

  async revertir(
    consumoId: number,
    dto: RevertirConsumoMaterialDto,
    usuarioId: number,
  ) {
    const consumo = await this.repo.findConsumoById(consumoId);
    if (!consumo) throw new NotFoundException('Consumo no encontrado.');
    await this.validarAmbito(consumo.proyectoId, usuarioId, true);
    try {
      return await this.repo.revertir(
        consumoId,
        dto.claveOperacion,
        dto.motivo.trim(),
        usuarioId,
      );
    } catch (error) {
      if (error instanceof ConsumoOperacionError) {
        this.throwRepositoryError(error);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const actualizado = await this.repo.findConsumoById(consumoId);
        if (
          actualizado?.claveReverso === dto.claveOperacion &&
          actualizado.motivoAnulacion === dto.motivo.trim()
        ) {
          return { consumo: actualizado, repetido: true };
        }
        throw new ConflictException(
          'La clave de reverso ya fue utilizada con datos diferentes.',
        );
      }
      throw error;
    }
  }

  async finalizarProyecto(proyectoId: number, usuarioId: number) {
    await this.validarAmbito(proyectoId, usuarioId, true);
    try {
      return await this.repo.finalizarProyecto(proyectoId, usuarioId);
    } catch (error) {
      if (error instanceof ConsumoOperacionError) {
        this.throwRepositoryError(error);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'El inventario cambió mientras se finalizaba el proyecto. Revisa los saldos e inténtalo de nuevo.',
        );
      }
      throw error;
    }
  }

  async findDesviaciones(proyectoId: number, usuarioId: number) {
    await this.validarAmbito(proyectoId, usuarioId);
    return this.sincronizarDesviacionesProyecto(proyectoId);
  }

  async sincronizarDesviacionesProyecto(proyectoId: number) {
    const data = await this.repo.findDatosDesviaciones(proyectoId);
    const presupuestado = new Map(
      data.detalles.map((item) => [item.materialId, item.cantidad]),
    );
    const acumulado = new Map<number, Prisma.Decimal>();
    const desviaciones: DatosDesviacion[] = [];

    for (const consumo of data.consumos) {
      const previo = acumulado.get(consumo.materialId) ?? new Prisma.Decimal(0);
      const total = previo.add(consumo.cantidad);
      const referenciaPresupuestada =
        presupuestado.get(consumo.materialId) ?? new Prisma.Decimal(0);

      if (total.greaterThan(referenciaPresupuestada)) {
        desviaciones.push({
          consumoId: consumo.id,
          proyectoId,
          materialId: consumo.materialId,
          regla: 'EXCESO_COTIZADO',
          valorObservado: total,
          valorReferencia: referenciaPresupuestada,
          factorUmbral: new Prisma.Decimal(1),
        });
      }

      acumulado.set(consumo.materialId, total);
    }

    return this.repo.sincronizarDesviaciones(proyectoId, desviaciones);
  }

  async generarReportePdf(
    proyectoId: number,
    query: ReporteConsumosQueryDto,
    usuarioId: number,
  ) {
    await this.validarAmbito(proyectoId, usuarioId);
    const desde = query.desde ? this.parseFecha(query.desde) : undefined;
    const hasta = query.hasta ? this.parseFecha(query.hasta) : undefined;
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
    }
    const data = await this.repo.findDatosReporte(proyectoId, desde, hasta);
    if (!data.proyecto) throw new NotFoundException('Proyecto no encontrado.');

    const agrupados = new Map<
      number,
      {
        codigo: string;
        material: string;
        unidad: string;
        usado: Prisma.Decimal;
        merma: Prisma.Decimal;
      }
    >();
    for (const consumo of data.consumos) {
      let row = agrupados.get(consumo.materialId);
      if (!row) {
        row = {
          codigo: consumo.material.codigo ?? '—',
          material: consumo.material.nombre,
          unidad: consumo.material.unidad,
          usado: new Prisma.Decimal(0),
          merma: new Prisma.Decimal(0),
        };
        agrupados.set(consumo.materialId, row);
      }
      if (consumo.clasificacion === ClasificacionConsumoMaterial.PERDIDA) {
        row.merma = row.merma.add(consumo.cantidad);
      } else {
        row.usado = row.usado.add(consumo.cantidad);
      }
    }

    const formatDate = (value: Date) => value.toISOString().slice(0, 10);
    const periodo =
      desde || hasta
        ? `${desde ? formatDate(desde) : 'Inicio'} al ${hasta ? formatDate(hasta) : 'Hoy'}`
        : 'Todo el proyecto';
    const filas = [...agrupados.values()]
      .sort((a, b) => a.material.localeCompare(b.material, 'es'))
      .map((row) => ({
        codigo: row.codigo,
        material: row.material,
        unidad: row.unidad,
        usado: row.usado.toString(),
        merma: row.merma.toString(),
        total: row.usado.add(row.merma).toString(),
      }));
    const buffer = await this.pdf.generar({
      proyecto: data.proyecto.nombre,
      ubicacion: data.proyecto.ubicacion ?? '',
      periodo,
      filas,
    });
    const nombreSeguro = data.proyecto.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    return {
      buffer,
      filename: `consumos-${nombreSeguro || proyectoId}.pdf`,
    };
  }

  private async validarAmbito(
    proyectoId: number,
    usuarioId: number,
    requiereAsignacionActiva = false,
  ) {
    const proyecto = await this.repo.findProyecto(proyectoId);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado.');
    if (
      !(await this.repo.usuarioPuedeOperarProyecto(
        usuarioId,
        proyectoId,
        requiereAsignacionActiva,
      ))
    ) {
      throw new ForbiddenException(
        'No tienes acceso a los consumos de este proyecto.',
      );
    }
    return proyecto;
  }

  private construirResumen(
    data: Awaited<ReturnType<ConsumosMaterialesRepository['findResumenData']>>,
  ) {
    const rows = new Map<number, MaterialResumen>();
    const get = (item: {
      materialId: number;
      material: MaterialResumen['material'];
    }) => {
      let row = rows.get(item.materialId);
      if (!row) {
        row = {
          material: item.material,
          presupuestado: new Prisma.Decimal(0),
          entregado: new Prisma.Decimal(0),
          devuelto: new Prisma.Decimal(0),
          produccion: new Prisma.Decimal(0),
          merma: new Prisma.Decimal(0),
          cierre: new Prisma.Decimal(0),
          consumido: new Prisma.Decimal(0),
          existenciaActual: new Prisma.Decimal(0),
        };
        rows.set(item.materialId, row);
      }
      return row;
    };

    for (const detalle of data.detalles) {
      get(detalle).presupuestado = detalle.cantidad;
    }
    for (const existencia of data.existencias) {
      get(existencia).existenciaActual = existencia.cantidad;
    }
    for (const movimiento of data.movimientos) {
      const row = get(movimiento);
      if (movimiento.motivo === 'USO_PROYECTO') {
        row.entregado = row.entregado.add(movimiento.cantidad);
      } else {
        row.devuelto = row.devuelto.add(movimiento.cantidad);
      }
    }
    for (const consumo of data.consumos) {
      const row = get(consumo);
      row.consumido = row.consumido.add(consumo.cantidad);
      if (consumo.clasificacion === 'PERDIDA') {
        row.merma = row.merma.add(consumo.cantidad);
      } else if (consumo.clasificacion === 'CIERRE') {
        row.cierre = row.cierre.add(consumo.cantidad);
      } else {
        row.produccion = row.produccion.add(consumo.cantidad);
      }
    }
    return [...rows.values()]
      .sort((a, b) => a.material.nombre.localeCompare(b.material.nombre, 'es'))
      .map((row) => ({
        material: row.material,
        presupuestado: row.presupuestado.toString(),
        entregado: row.entregado.toString(),
        devuelto: row.devuelto.toString(),
        produccion: row.produccion.toString(),
        merma: row.merma.toString(),
        cierre: row.cierre.toString(),
        consumido: row.consumido.toString(),
        existenciaActual: row.existenciaActual.toString(),
      }));
  }

  private validarReintento(
    existente: Awaited<
      ReturnType<ConsumosMaterialesRepository['findConsumoByKey']>
    > & {},
    dto: RegistrarConsumoMaterialDto,
    fechaJornada: Date,
  ) {
    if (
      existente.proyectoId !== dto.proyectoId ||
      existente.materialId !== dto.materialId ||
      !existente.cantidad.equals(dto.cantidad) ||
      existente.clasificacion !== dto.clasificacion ||
      existente.fechaJornada.toISOString().slice(0, 10) !==
        fechaJornada.toISOString().slice(0, 10) ||
      (existente.motivo ?? '') !== (dto.motivo?.trim() ?? '') ||
      (existente.actividadReferencia ?? '') !==
        (dto.actividadReferencia?.trim() ?? '') ||
      (existente.reporteReferencia ?? '') !==
        (dto.reporteReferencia?.trim() ?? '')
    ) {
      throw new ConflictException(
        'La clave de operación ya fue utilizada con datos diferentes.',
      );
    }
    return { consumo: existente, repetido: true };
  }

  private parseFecha(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('La fecha de jornada no es válida.');
    }
    return date;
  }

  private throwRepositoryError(error: ConsumoOperacionError): never {
    if (error.code === 'PROYECTO_NO_ENCONTRADO')
      throw new NotFoundException('Proyecto no encontrado.');
    if (error.code === 'MATERIAL_NO_ENCONTRADO')
      throw new NotFoundException('Material no encontrado.');
    if (error.code === 'CONSUMO_NO_ENCONTRADO')
      throw new NotFoundException('Consumo no encontrado.');
    if (error.code === 'PROYECTO_NO_ACTIVO')
      throw new ConflictException(
        'Solo se pueden registrar o corregir consumos en proyectos activos.',
      );
    if (error.code === 'MATERIAL_INACTIVO')
      throw new ConflictException(
        'No se puede registrar consumo de un material desactivado.',
      );
    if (error.code === 'SALDO_INSUFICIENTE')
      throw new ConflictException(
        `La cantidad supera el saldo disponible del proyecto. Actualmente hay ${error.details?.cantidadDisponible ?? '0'} unidades disponibles.`,
      );
    if (error.code === 'CONSUMO_YA_ANULADO')
      throw new ConflictException('Este consumo ya fue corregido.');
    if (error.code === 'CLAVE_REVERSO_DATOS_DIFERENTES')
      throw new ConflictException(
        'La clave de reverso ya fue utilizada con datos diferentes.',
      );
    if (error.code === 'HERRAMIENTAS_ASIGNADAS')
      throw new ConflictException(
        `Retira las ${error.details?.cantidad ?? 0} herramienta(s) asignadas antes de finalizar el proyecto.`,
      );
    throw new ConflictException('No se pudo completar la operación.');
  }
}
