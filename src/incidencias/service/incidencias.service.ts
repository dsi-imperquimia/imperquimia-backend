import { ActividadesDiariasService } from '@/actividades-diarias/service/actividades-diarias.service';
import {
  EstadoIncidencia,
  Prisma,
  PrioridadIncidencia,
} from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActualizarIncidenciaDto } from '../dto/actualizar-incidencia.dto';
import { CambiarEstadoIncidenciaDto } from '../dto/cambiar-estado-incidencia.dto';
import { CrearIncidenciaDto } from '../dto/crear-incidencia.dto';
import { IncidenciasRepository } from '../repository/incidencias.repository';

type UsuarioAcceso = {
  empleadoId: number | null;
  role?: { name?: string | null } | null;
};

const ESTADOS: EstadoIncidencia[] = ['ABIERTA', 'EN_PROCESO', 'RESUELTA'];
const PRIORIDADES: PrioridadIncidencia[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

@Injectable()
export class IncidenciasService {
  constructor(
    private readonly repo: IncidenciasRepository,
    private readonly actividades: ActividadesDiariasService,
  ) {}

  /** Proyectos en los que el usuario puede registrar incidencias. */
  findProyectosDisponibles(usuarioId: number) {
    return this.actividades.findProyectosDisponibles(usuarioId);
  }

  async findAll(
    usuarioId: number,
    filtros: {
      proyectoId?: number;
      estado?: string;
      prioridad?: string;
      actividadDiariaId?: number;
    },
  ) {
    const usuario = await this.obtenerUsuario(usuarioId);
    const esAdmin = this.esAdministrador(usuario);
    if (!esAdmin && !usuario.empleadoId) return [];

    const estado = filtros.estado?.trim().toUpperCase();
    if (estado && !ESTADOS.includes(estado as EstadoIncidencia)) {
      throw new BadRequestException(
        'El estado debe ser ABIERTA, EN_PROCESO o RESUELTA.',
      );
    }
    const prioridad = filtros.prioridad?.trim().toUpperCase();
    if (prioridad && !PRIORIDADES.includes(prioridad as PrioridadIncidencia)) {
      throw new BadRequestException(
        'La prioridad debe ser BAJA, MEDIA, ALTA o CRITICA.',
      );
    }

    return this.repo.findMany({
      proyectoId: filtros.proyectoId,
      actividadDiariaId: filtros.actividadDiariaId,
      estado: estado as EstadoIncidencia | undefined,
      prioridad: prioridad as PrioridadIncidencia | undefined,
      jefeProyectoId: esAdmin ? undefined : (usuario.empleadoId ?? undefined),
    });
  }

  async findOne(id: number, usuarioId: number) {
    const usuario = await this.obtenerUsuario(usuarioId);
    const incidencia = await this.repo.findById(id);
    if (!incidencia) {
      throw new NotFoundException('La incidencia no existe.');
    }
    this.validarAcceso(
      usuario,
      incidencia.proyecto.jefeProyectoId,
      'Solo el jefe de proyecto asignado puede consultar esta incidencia.',
    );
    return incidencia;
  }

  async registrar(dto: CrearIncidenciaDto, usuarioId: number) {
    const { titulo, descripcion } = this.normalizarTextos(dto);
    const fecha = this.parsearYValidarFecha(dto.fecha);

    const existente = await this.repo.findByClave(dto.claveOperacion);
    if (existente) {
      if (existente.usuarioId !== usuarioId) {
        throw new ConflictException(
          'La clave de operación ya fue utilizada en otro registro.',
        );
      }
      return { incidencia: existente, repetido: true };
    }

    const [usuario, proyecto] = await Promise.all([
      this.obtenerUsuario(usuarioId),
      this.repo.findProyecto(dto.proyectoId),
    ]);
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado.');
    }
    if (proyecto.estado === 'CANCELADO') {
      throw new BadRequestException(
        'No se pueden registrar incidencias en un proyecto cancelado.',
      );
    }
    this.validarAcceso(
      usuario,
      proyecto.jefeProyectoId,
      'Solo el jefe de proyecto asignado puede registrar incidencias.',
    );
    // GPRCIMPER-142: la incidencia puede nacer vinculada a una jornada.
    if (dto.actividadDiariaId !== undefined) {
      await this.validarActividad(dto.actividadDiariaId, proyecto.id, usuario);
    }

    try {
      const incidencia = await this.repo.crear({
        claveOperacion: dto.claveOperacion,
        proyectoId: proyecto.id,
        usuarioId: usuario.id,
        titulo,
        descripcion,
        fecha,
        prioridad: dto.prioridad ?? 'MEDIA',
        actividadDiariaId: dto.actividadDiariaId,
      });
      return { incidencia, repetido: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrente = await this.repo.findByClave(dto.claveOperacion);
        if (concurrente && concurrente.usuarioId === usuarioId) {
          return { incidencia: concurrente, repetido: true };
        }
        throw new ConflictException(
          'La clave de operación ya fue utilizada en otro registro.',
        );
      }
      throw error;
    }
  }

  async actualizar(
    id: number,
    dto: ActualizarIncidenciaDto,
    usuarioId: number,
  ) {
    const incidencia = await this.findOne(id, usuarioId);
    const data: Prisma.IncidenciaUpdateInput = {};

    if (dto.titulo !== undefined || dto.descripcion !== undefined) {
      const { titulo, descripcion } = this.normalizarTextos({
        titulo: dto.titulo ?? incidencia.titulo,
        descripcion: dto.descripcion ?? incidencia.descripcion,
      });
      data.titulo = titulo;
      data.descripcion = descripcion;
    }
    if (dto.fecha !== undefined) {
      data.fecha = this.parsearYValidarFecha(dto.fecha);
    }
    if (dto.prioridad !== undefined) {
      data.prioridad = dto.prioridad;
    }
    return this.repo.actualizar(id, data);
  }

  async cambiarEstado(
    id: number,
    dto: CambiarEstadoIncidenciaDto,
    usuarioId: number,
  ) {
    const incidencia = await this.findOne(id, usuarioId);
    if (incidencia.estado === dto.estado) {
      throw new BadRequestException(
        'La incidencia ya se encuentra en ese estado.',
      );
    }
    return this.repo.cambiarEstado(
      id,
      usuarioId,
      incidencia.estado,
      dto.estado,
      dto.comentario?.trim() || null,
    );
  }

  /** GPRCIMPER-142: deja exactamente estas incidencias vinculadas a la jornada. */
  async vincularAJornada(
    actividadDiariaId: number,
    incidenciaIds: number[],
    usuarioId: number,
  ) {
    const usuario = await this.obtenerUsuario(usuarioId);
    const actividad = await this.repo.findActividad(actividadDiariaId);
    if (!actividad) {
      throw new NotFoundException('El registro de actividad diaria no existe.');
    }
    this.validarAcceso(
      usuario,
      actividad.proyecto.jefeProyectoId,
      'Solo el jefe de proyecto asignado puede vincular incidencias a este reporte.',
    );

    if (incidenciaIds.length > 0) {
      const encontradas = await this.repo.findPorIds(incidenciaIds);
      if (encontradas.length !== incidenciaIds.length) {
        throw new NotFoundException(
          'Alguna incidencia seleccionada no existe.',
        );
      }
      if (encontradas.some((i) => i.proyectoId !== actividad.proyectoId)) {
        throw new BadRequestException(
          'Solo se pueden vincular incidencias del mismo proyecto del reporte.',
        );
      }
      if (
        encontradas.some(
          (i) =>
            i.actividadDiariaId !== null &&
            i.actividadDiariaId !== actividadDiariaId,
        )
      ) {
        throw new ConflictException(
          'Alguna incidencia ya está vinculada a otro reporte de jornada.',
        );
      }
    }
    return this.repo.reemplazarVinculos(actividadDiariaId, incidenciaIds);
  }

  /** Incidencias vinculadas a una jornada (vista desde el reporte). */
  async findPorJornada(actividadDiariaId: number, usuarioId: number) {
    const usuario = await this.obtenerUsuario(usuarioId);
    const actividad = await this.repo.findActividad(actividadDiariaId);
    if (!actividad) {
      throw new NotFoundException('El registro de actividad diaria no existe.');
    }
    this.validarAcceso(
      usuario,
      actividad.proyecto.jefeProyectoId,
      'Solo el jefe de proyecto asignado puede consultar este reporte.',
    );
    return this.repo.findMany({ actividadDiariaId });
  }

  private async validarActividad(
    actividadDiariaId: number,
    proyectoId: number,
    usuario: UsuarioAcceso,
  ) {
    const actividad = await this.repo.findActividad(actividadDiariaId);
    if (!actividad) {
      throw new NotFoundException('El registro de actividad diaria no existe.');
    }
    if (actividad.proyectoId !== proyectoId) {
      throw new BadRequestException(
        'La incidencia y el reporte deben pertenecer al mismo proyecto.',
      );
    }
    this.validarAcceso(
      usuario,
      actividad.proyecto.jefeProyectoId,
      'Solo el jefe de proyecto asignado puede vincular incidencias a este reporte.',
    );
    return actividad;
  }

  private async obtenerUsuario(usuarioId: number) {
    const usuario = await this.repo.findUsuario(usuarioId);
    if (!usuario) {
      throw new ForbiddenException('Usuario no disponible.');
    }
    return usuario;
  }

  private validarAcceso(
    usuario: UsuarioAcceso,
    jefeProyectoId: number | null,
    mensaje: string,
  ) {
    if (this.esAdministrador(usuario)) return;
    if (!usuario.empleadoId || jefeProyectoId !== usuario.empleadoId) {
      throw new ForbiddenException(mensaje);
    }
  }

  private esAdministrador(usuario: UsuarioAcceso): boolean {
    const nombre = usuario.role?.name;
    if (!nombre) return false;
    const normalizado = nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLocaleLowerCase();
    return normalizado === 'administrador' || normalizado === 'administracion';
  }

  private normalizarTextos(dto: { titulo?: string; descripcion?: string }) {
    const titulo = dto.titulo?.trim() ?? '';
    const descripcion = dto.descripcion?.trim() ?? '';
    const errores: Record<string, string[]> = {};
    if (!titulo) errores.titulo = ['Ingresa el título de la incidencia.'];
    if (!descripcion) {
      errores.descripcion = ['Ingresa la descripción de la incidencia.'];
    }
    if (Object.keys(errores).length > 0) {
      throw new BadRequestException({
        message: errores,
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    return { titulo, descripcion };
  }

  private parsearYValidarFecha(valor: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    const anio = Number(match?.[1]);
    const mes = Number(match?.[2]);
    const dia = Number(match?.[3]);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      !match ||
      fecha.getUTCFullYear() !== anio ||
      fecha.getUTCMonth() !== mes - 1 ||
      fecha.getUTCDate() !== dia
    ) {
      throw new BadRequestException({
        message: { fecha: ['Ingresa una fecha válida en formato AAAA-MM-DD.'] },
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    const ahora = new Date();
    const hoyUtc = new Date(
      Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
    );
    if (fecha > hoyUtc) {
      throw new BadRequestException({
        message: { fecha: ['La fecha no puede ser futura.'] },
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    return fecha;
  }
}
