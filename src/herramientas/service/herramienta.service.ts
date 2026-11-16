import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HerramientaRepository } from '../repository/herramientaRepository';
import { CreateHerramientaDto } from '../dto/create-herramienta.dto';
import { UpdateHerramientaDto } from '../dto/update-herramienta.dto';
import { EstadoHerramienta, Prisma } from '@gen/prisma/client';
import { TiposHerramientaService } from './tipos-herramienta.service';
import { MarcasHerramientaService } from './marcas-herramienta.service';
import { CreateReporteDefectoDto } from '../dto/create-reporte-defecto.dto';

@Injectable()
export class HerramientaService {
  constructor(
    private readonly repo: HerramientaRepository,
    private readonly tipos: TiposHerramientaService,
    private readonly marcas: MarcasHerramientaService,
  ) {}

  async create(dto: CreateHerramientaDto) {
    if (
      dto.proyectoId != null &&
      !(await this.repo.findProyectoAsignable(dto.proyectoId))
    ) {
      throw new BadRequestException('El proyecto no existe o no está activo.');
    }
    await this.tipos.ensureSelectable(dto.tipoId);
    const marca = await this.marcas.ensureSelectable(dto.marcaId);
    const codigoUnico = await this.generarCodigoUnico();

    const herramienta = await this.repo.create({
      codigoUnico,
      nombre: dto.nombre,
      marca: marca.nombre,
      marcaId: marca.id,
      tipoId: dto.tipoId,
      estado:
        dto.proyectoId != null
          ? EstadoHerramienta.EN_PROYECTO
          : EstadoHerramienta.DISPONIBLE,
      proyectoId: dto.proyectoId ?? null,
      ubicacionActual: dto.proyectoId != null ? 'PROYECTO' : 'BODEGA',
    });
    return this.withTipoNombre(herramienta);
  }

  // Construye dinámicamente las condiciones del WHERE para Prisma
  async findAll(proyectoId?: number, estado?: EstadoHerramienta) {
    const where: Prisma.HerramientaWhereInput = {};

    if (proyectoId !== undefined) {
      where.proyectoId = proyectoId;
    }

    if (estado !== undefined) {
      where.estado = estado;
    }

    const herramientas = await this.repo.findMany(
      Object.keys(where).length > 0 ? where : undefined,
    );
    return herramientas.map((herramienta) => this.withTipoNombre(herramienta));
  }

  async findAllParaUsuario(
    usuarioId: number,
    proyectoId?: number,
    estado?: EstadoHerramienta,
  ) {
    const alcance = await this.repo.alcanceLectura(usuarioId);
    if (alcance.completo) return this.findAll(proyectoId, estado);
    if (alcance.empleadoId === null) return [];

    const empleadoId = alcance.empleadoId;
    const herramientas = await this.repo.findMany({
      ...(proyectoId !== undefined ? { proyectoId } : {}),
      ...(estado !== undefined ? { estado } : {}),
      proyecto: {
        is: {
          deletedAt: null,
          OR: [
            { jefeProyectoId: empleadoId },
            { empleados: { some: { empleadoId, fechaRetiro: null } } },
          ],
        },
      },
    });
    return herramientas.map((herramienta) => this.withTipoNombre(herramienta));
  }

  async findOne(id: number) {
    const herramienta = await this.repo.findUnique(id);
    if (!herramienta) {
      throw new NotFoundException(`Herramienta #${id} no encontrada`);
    }
    return this.withTipoNombre(herramienta);
  }

  async findOneParaUsuario(id: number, usuarioId: number) {
    const alcance = await this.repo.alcanceLectura(usuarioId);
    if (alcance.completo) return this.findOne(id);
    const herramienta =
      alcance.empleadoId === null
        ? null
        : await this.repo.findAsignada(id, alcance.empleadoId);
    if (!herramienta) {
      throw new NotFoundException(`Herramienta #${id} no encontrada`);
    }
    return this.withTipoNombre(herramienta);
  }

  async update(id: number, dto: UpdateHerramientaDto) {
    const actual = await this.findOne(id);
    if (dto.tipoId !== undefined && dto.tipoId !== actual.tipoId) {
      await this.tipos.ensureSelectable(dto.tipoId);
    }
    const marca =
      dto.marcaId !== undefined && dto.marcaId !== actual.marcaId
        ? await this.marcas.ensureSelectable(dto.marcaId)
        : undefined;
    const herramienta = await this.repo.update(id, {
      ...dto,
      ...(marca ? { marca: marca.nombre } : {}),
    });
    return this.withTipoNombre(herramienta);
  }

  async reportarDefecto(
    herramientaId: number,
    dto: CreateReporteDefectoDto,
    usuarioId: number,
  ) {
    const herramienta = await this.repo.findUnique(herramientaId);
    if (!herramienta) {
      throw new NotFoundException(
        `Herramienta #${herramientaId} no encontrada`,
      );
    }
    if (
      !(await this.repo.usuarioPuedeOperarHerramienta(usuarioId, herramientaId))
    ) {
      throw new ForbiddenException(
        'No tienes acceso para reportar el estado de esta herramienta.',
      );
    }
    if (herramienta.estado === EstadoHerramienta.DESECHO) {
      throw new ConflictException(
        'No se puede reportar una herramienta que ya fue dada de baja.',
      );
    }
    if (herramienta.estado === EstadoHerramienta.REQUIERE_REVISION) {
      throw new ConflictException(
        'La herramienta ya tiene un reporte pendiente de revisión.',
      );
    }

    const observacion = dto.observacion?.trim();
    if (!observacion) {
      throw new BadRequestException('Describe el defecto de la herramienta.');
    }
    try {
      return await this.repo.crearReporteDefecto({
        herramientaId,
        observacion,
        reportadoPorId: usuarioId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'REPORTE_PENDIENTE') {
        throw new ConflictException(
          'La herramienta ya tiene un reporte pendiente de revisión.',
        );
      }
      throw error;
    }
  }

  async findReportesDefecto(herramientaId: number, usuarioId: number) {
    const herramienta = await this.repo.findUnique(herramientaId);
    if (!herramienta) {
      throw new NotFoundException(
        `Herramienta #${herramientaId} no encontrada`,
      );
    }
    if (
      !(await this.repo.usuarioPuedeOperarHerramienta(usuarioId, herramientaId))
    ) {
      throw new ForbiddenException(
        'No tienes acceso a los reportes de esta herramienta.',
      );
    }
    return this.repo.findReportesDefecto(herramientaId);
  }

  private withTipoNombre<T extends { tipo: { nombre: string } }>(
    herramienta: T,
  ) {
    const { tipo, ...datos } = herramienta;
    return { ...datos, tipo: tipo.nombre };
  }

  private async generarCodigoUnico(): Promise<string> {
    const herramientas = await this.repo.findMany();

    const numeros = herramientas
      .map((h) => {
        const match = h.codigoUnico.match(/^HERR-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
    const codigo = `HERR-${String(siguiente).padStart(4, '0')}`;

    const existe = await this.repo.findByCodigoUnico(codigo);
    if (existe) {
      throw new BadRequestException(
        `El código generado ${codigo} ya existe, intenta de nuevo`,
      );
    }

    return codigo;
  }
}
