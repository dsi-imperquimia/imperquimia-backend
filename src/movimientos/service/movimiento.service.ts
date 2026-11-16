import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovimientoRepository } from '../repository/movimientoRepository';
import { HerramientaRepository } from '@/herramientas/repository/herramientaRepository';
import { CreateMovimientoDto } from '../dto/create-movimiento.dto';
import { EstadoHerramienta, AreaMovimiento } from '@gen/prisma/client';

@Injectable()
export class MovimientoService {
  constructor(
    private readonly repo: MovimientoRepository,
    private readonly herramientaRepo: HerramientaRepository,
  ) {}

  async create(dto: CreateMovimientoDto, usuarioId: number) {
    const herramienta = await this.herramientaRepo.findUnique(
      dto.herramientaId,
    );
    if (!herramienta) {
      throw new NotFoundException(
        `Herramienta #${dto.herramientaId} no encontrada`,
      );
    }

    if (dto.origen !== herramienta.ubicacionActual) {
      throw new ConflictException(
        `La herramienta ya no se encuentra en "${dto.origen}". Su ubicación actual es "${herramienta.ubicacionActual}".`,
      );
    }

    this.validarTransicion(herramienta.estado, dto.destino, dto.conDano);

    if (dto.destino === AreaMovimiento.PROYECTO && !dto.proyectoDestinoId) {
      throw new BadRequestException(
        'proyectoDestinoId es obligatorio cuando el destino es PROYECTO',
      );
    }
    if (
      dto.destino === AreaMovimiento.PROYECTO &&
      !(await this.repo.findProyectoAsignable(dto.proyectoDestinoId!))
    ) {
      throw new BadRequestException(
        'El proyecto de destino no existe o no está activo.',
      );
    }

    const estadoNuevo = this.deducirEstado(
      herramienta.estado,
      dto.destino,
      dto.conDano,
    );

    try {
      return await this.repo.createWithTransaction({
        herramientaId: dto.herramientaId,
        usuarioId,
        origen: herramienta.ubicacionActual,
        destino: dto.destino,
        proyectoDestinoId: dto.proyectoDestinoId ?? null,
        estadoActual: herramienta.estado,
        estadoHerramienta: estadoNuevo,
        observaciones: dto.observaciones,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'UBICACION_CAMBIO') {
        throw new ConflictException(
          'La ubicación o el estado de la herramienta cambió. Actualiza la página e intenta nuevamente.',
        );
      }
      throw error;
    }
  }

  async findAll(herramientaId?: number) {
    return this.repo.findMany(herramientaId);
  }

  async findOne(id: number) {
    const movimiento = await this.repo.findUnique(id);
    if (!movimiento) {
      throw new NotFoundException(`Movimiento #${id} no encontrado`);
    }
    return movimiento;
  }

  private validarTransicion(
    estadoActual: EstadoHerramienta,
    destino: AreaMovimiento,
    conDano?: boolean,
  ) {
    const transicionesValidas: Record<EstadoHerramienta, AreaMovimiento[]> = {
      DISPONIBLE: [
        AreaMovimiento.PROYECTO,
        AreaMovimiento.TALLER,
        AreaMovimiento.DESECHO,
      ],
      EN_PROYECTO: [AreaMovimiento.BODEGA, AreaMovimiento.TALLER],
      MANTENIMIENTO: [AreaMovimiento.BODEGA, AreaMovimiento.DESECHO],
      DANADA: [AreaMovimiento.TALLER, AreaMovimiento.DESECHO],
      REQUIERE_REVISION: [
        AreaMovimiento.BODEGA,
        AreaMovimiento.TALLER,
        AreaMovimiento.DESECHO,
      ],
      DESECHO: [],
    };

    if (!transicionesValidas[estadoActual].includes(destino)) {
      throw new BadRequestException(
        `No se puede mover una herramienta en estado "${estadoActual}" al destino "${destino}"`,
      );
    }

    if (conDano && destino !== AreaMovimiento.BODEGA) {
      throw new BadRequestException(
        'conDano solo aplica cuando el destino es BODEGA',
      );
    }
  }

  private deducirEstado(
    estadoActual: EstadoHerramienta,
    destino: AreaMovimiento,
    conDano?: boolean,
  ): EstadoHerramienta {
    if (
      estadoActual === EstadoHerramienta.REQUIERE_REVISION &&
      destino !== AreaMovimiento.DESECHO
    ) {
      return EstadoHerramienta.REQUIERE_REVISION;
    }
    if (destino === AreaMovimiento.BODEGA && conDano) {
      return EstadoHerramienta.DANADA;
    }

    const mapa: Record<AreaMovimiento, EstadoHerramienta> = {
      PROYECTO: EstadoHerramienta.EN_PROYECTO,
      BODEGA: EstadoHerramienta.DISPONIBLE,
      TALLER: EstadoHerramienta.MANTENIMIENTO,
      DESECHO: EstadoHerramienta.DESECHO,
    };
    return mapa[destino];
  }
}
