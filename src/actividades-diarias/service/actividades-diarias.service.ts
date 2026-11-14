import { Prisma } from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CrearActividadDiariaDto } from '../dto/crear-actividad-diaria.dto';
import { ActividadesDiariasRepository } from '../repository/actividades-diarias.repository';

@Injectable()
export class ActividadesDiariasService {
  constructor(private readonly repo: ActividadesDiariasRepository) {}

  async findProyectosDisponibles(usuarioId: number) {
    const usuario = await this.repo.findUsuario(usuarioId);
    if (!usuario) {
      throw new ForbiddenException('Usuario no disponible.');
    }
    const esAdmin = usuario.role?.name.toLocaleLowerCase() === 'administrador';
    return this.repo.findProyectosDisponibles(usuario.empleadoId, esAdmin);
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

    const esAdmin = usuario.role?.name.toLocaleLowerCase() === 'administrador';
    if (!esAdmin) {
      const empleadoId = usuario.empleadoId;
      const esJefe =
        Boolean(empleadoId) && proyecto.jefeProyectoId === empleadoId;
      const asignado =
        esJefe ||
        (empleadoId
          ? await this.repo.existeAsignacionActiva(proyecto.id, empleadoId)
          : false);
      if (!asignado) {
        throw new ForbiddenException('No estás asignado a este proyecto.');
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
