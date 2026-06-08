import {
  BadRequestException,
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
    const herramienta = await this.herramientaRepo.findUnique(dto.herramientaId);
    if (!herramienta) {
      throw new NotFoundException(
        `Herramienta #${dto.herramientaId} no encontrada`,
      );
    }

    this.validarTransicion(herramienta.estado, dto.destino, dto.conDano);

    if (dto.destino === AreaMovimiento.PROYECTO && !dto.proyectoDestinoId) {
      throw new BadRequestException(
        'proyectoDestinoId es obligatorio cuando el destino es PROYECTO',
      );
    }

    const estadoNuevo = this.deducirEstado(dto.destino, dto.conDano);

    return this.repo.createWithTransaction({
      herramientaId: dto.herramientaId,
      usuarioId,
      origen: dto.origen,
      destino: dto.destino,
      proyectoDestinoId: dto.proyectoDestinoId ?? null,
      estadoHerramienta: estadoNuevo,
      observaciones: dto.observaciones,
    });
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
      DISPONIBLE: [AreaMovimiento.PROYECTO, AreaMovimiento.TALLER, AreaMovimiento.DESECHO],
      EN_PROYECTO: [AreaMovimiento.BODEGA, AreaMovimiento.TALLER],
      MANTENIMIENTO: [AreaMovimiento.BODEGA, AreaMovimiento.DESECHO],
      DANADA: [AreaMovimiento.TALLER, AreaMovimiento.DESECHO],
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

  private deducirEstado(destino: AreaMovimiento, conDano?: boolean): EstadoHerramienta {
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