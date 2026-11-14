import { Prisma } from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActualizarActividadDiariaDto } from '../dto/actualizar-actividad-diaria.dto';
import { CrearActividadDiariaDto } from '../dto/crear-actividad-diaria.dto';
import { ActividadesDiariasRepository } from '../repository/actividades-diarias.repository';

export const PLAZO_EDICION_HORAS = 48;
export const PLAZO_EDICION_MS = PLAZO_EDICION_HORAS * 60 * 60 * 1000;

@Injectable()
export class ActividadesDiariasService {
  constructor(private readonly repo: ActividadesDiariasRepository) {}

  async findProyectosDisponibles(usuarioId: number) {
    const usuario = await this.repo.findUsuario(usuarioId);
    if (!usuario) {
      throw new ForbiddenException('Usuario no disponible.');
    }
    const esAdmin = this.esAdministrador(usuario.role?.name);
    return this.repo.findProyectosDisponibles(usuario.empleadoId, esAdmin);
  }

  async findActividades(usuarioId: number, proyectoId?: number) {
    const usuario = await this.repo.findUsuario(usuarioId);
    if (!usuario) {
      throw new ForbiddenException('Usuario no disponible.');
    }
    if (!proyectoId || !Number.isInteger(proyectoId) || proyectoId < 1) {
      throw new BadRequestException('Selecciona un proyecto válido.');
    }
    const proyecto = await this.repo.findProyecto(proyectoId);
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado.');
    }
    const esAdmin = this.esAdministrador(usuario.role?.name);
    if (!esAdmin && proyecto.jefeProyectoId !== usuario.empleadoId) {
      throw new ForbiddenException(
        'Solo el jefe de proyecto asignado puede consultar sus actividades.',
      );
    }
    return this.repo.findPorProyecto(proyecto.id);
  }

  async findOne(id: number, usuarioId: number) {
    const [usuario, actividad] = await Promise.all([
      this.repo.findUsuario(usuarioId),
      this.repo.findById(id),
    ]);
    if (!usuario) {
      throw new ForbiddenException('Usuario no disponible.');
    }
    if (!actividad) {
      throw new NotFoundException('El registro de actividad diaria no existe.');
    }
    const esAdmin = this.esAdministrador(usuario.role?.name);
    if (
      !esAdmin &&
      actividad.proyecto.jefeProyectoId !== usuario.empleadoId &&
      actividad.usuarioId !== usuario.id
    ) {
      throw new ForbiddenException(
        'Solo el jefe de proyecto asignado puede consultar esta actividad.',
      );
    }
    return actividad;
  }

  async registrar(dto: CrearActividadDiariaDto, usuarioId: number) {
    const descripcion = dto.descripcion?.trim() ?? '';
    if (!descripcion) {
      throw new BadRequestException({
        message: {
          descripcion: ['Ingresa la descripción de la actividad.'],
        },
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    const fecha = this.parsearYValidarFecha(dto.fecha);

    const existente = await this.repo.findByClave(dto.claveOperacion);
    if (existente) {
      if (existente.usuarioId !== usuarioId) {
        throw new ConflictException(
          'La clave de operación ya fue utilizada en otro registro.',
        );
      }
      return { actividad: existente, repetido: true };
    }

    const [usuario, proyecto] = await Promise.all([
      this.repo.findUsuario(usuarioId),
      this.repo.findProyecto(dto.proyectoId),
    ]);

    if (!usuario) {
      throw new ForbiddenException('Usuario no disponible.');
    }
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado.');
    }
    if (proyecto.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se pueden registrar actividades en proyectos activos.',
      );
    }

    const esAdmin = this.esAdministrador(usuario.role?.name);
    if (!esAdmin) {
      const empleadoId = usuario.empleadoId;
      const esJefe =
        Boolean(empleadoId) && proyecto.jefeProyectoId === empleadoId;
      if (!esJefe) {
        throw new ForbiddenException(
          'Solo el jefe de proyecto asignado puede registrar actividades diarias.',
        );
      }
    }

    const observaciones = dto.observaciones?.trim() || undefined;

    try {
      const actividad = await this.repo.crear({
        claveOperacion: dto.claveOperacion,
        proyectoId: proyecto.id,
        usuarioId: usuario.id,
        empleadoId: usuario.empleadoId,
        fecha,
        descripcion,
        observaciones,
      });
      return { actividad, repetido: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrente = await this.repo.findByClave(dto.claveOperacion);
        if (concurrente && concurrente.usuarioId === usuarioId) {
          return { actividad: concurrente, repetido: true };
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
    dto: ActualizarActividadDiariaDto,
    usuarioId: number,
  ) {
    const descripcion = dto.descripcion?.trim() ?? '';
    if (!descripcion) {
      throw new BadRequestException({
        message: {
          descripcion: ['Ingresa la descripción de la actividad.'],
        },
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    const fecha = dto.fecha ? this.parsearYValidarFecha(dto.fecha) : undefined;

    const [usuario, actividad] = await Promise.all([
      this.repo.findUsuario(usuarioId),
      this.repo.findById(id),
    ]);

    if (!usuario) {
      throw new ForbiddenException('Usuario no disponible.');
    }
    if (!actividad) {
      throw new NotFoundException('El registro de actividad diaria no existe.');
    }

    const esAdmin = this.esAdministrador(usuario.role?.name);
    if (!esAdmin) {
      const esJefe =
        Boolean(usuario.empleadoId) &&
        actividad.proyecto.jefeProyectoId === usuario.empleadoId;
      if (!esJefe && actividad.usuarioId !== usuario.id) {
        throw new ForbiddenException(
          'Solo el jefe de proyecto asignado puede editar este registro.',
        );
      }

      const diferenciaMs = Date.now() - new Date(actividad.createdAt).getTime();
      if (diferenciaMs >= PLAZO_EDICION_MS) {
        throw new ForbiddenException(
          'El plazo de 48 horas para editar este registro ha vencido. Solo administración puede editarlo.',
        );
      }
    }

    const observaciones = dto.observaciones?.trim() || null;

    return this.repo.actualizar(id, {
      fecha,
      descripcion,
      observaciones,
    });
  }

  private esAdministrador(rolNombre?: string | null): boolean {
    if (!rolNombre) return false;
    const normalizado = rolNombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
    return normalizado === 'administrador' || normalizado === 'administracion';
  }

  private parsearYValidarFecha(valor: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    if (!match) {
      throw new BadRequestException({
        message: {
          fecha: ['Ingresa una fecha válida en formato AAAA-MM-DD.'],
        },
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    const anio = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      fecha.getUTCFullYear() !== anio ||
      fecha.getUTCMonth() !== mes - 1 ||
      fecha.getUTCDate() !== dia
    ) {
      throw new BadRequestException({
        message: {
          fecha: ['Ingresa una fecha válida en formato AAAA-MM-DD.'],
        },
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
        message: {
          fecha: ['La fecha no puede ser futura.'],
        },
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    return fecha;
  }
}
