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

  async findActividades(
    usuarioId: number,
    proyectoId?: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    const { actividades } = await this.obtenerActividadesFiltradas(
      usuarioId,
      proyectoId,
      fechaInicio,
      fechaFin,
    );
    return actividades;
  }

  async findParaExportar(
    usuarioId: number,
    proyectoId?: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    return this.obtenerActividadesFiltradas(
      usuarioId,
      proyectoId,
      fechaInicio,
      fechaFin,
    );
  }

  private obtenerFechaActualNegocio(): { fecha: Date; iso: string } {
    const iso = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const fecha = this.parsearFechaCalendar(iso);
    if (!fecha) {
      const ahora = new Date();
      const fallback = new Date(
        Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
      );
      return { fecha: fallback, iso: fallback.toISOString().slice(0, 10) };
    }
    return { fecha, iso };
  }

  private async obtenerActividadesFiltradas(
    usuarioId: number,
    proyectoId?: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    const usuario = await this.repo.findUsuario(usuarioId);
    if (!usuario) {
      throw new ForbiddenException('Usuario no disponible.');
    }
    const { rango, fechaInicioIso, fechaFinIso } = this.construirRangoFechas(
      fechaInicio,
      fechaFin,
    );
    const esAdmin = this.esAdministrador(usuario.role?.name);
    const hoy = this.obtenerFechaActualNegocio();
    const nombreDefecto = `Bitácora del día ${hoy.iso}`;
    if (proyectoId === undefined) {
      await this.repo.asegurarActividadesDelDiaAccesibles?.({
        usuarioId: usuario.id,
        empleadoId: usuario.empleadoId,
        esAdmin,
        fecha: hoy.fecha,
        nombre: nombreDefecto,
      });
      const actividades = rango
        ? await this.repo.findAccesibles(usuario.empleadoId, esAdmin, rango)
        : await this.repo.findAccesibles(usuario.empleadoId, esAdmin);
      return {
        actividades,
        filtros: {
          fechaInicio: fechaInicioIso,
          fechaFin: fechaFinIso,
        },
      };
    }
    if (!Number.isInteger(proyectoId) || proyectoId < 1) {
      throw new BadRequestException('Selecciona un proyecto válido.');
    }
    const proyecto = await this.repo.findProyecto(proyectoId);
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado.');
    }
    if (!esAdmin && proyecto.jefeProyectoId !== usuario.empleadoId) {
      throw new ForbiddenException(
        'Solo el jefe de proyecto asignado puede consultar sus actividades.',
      );
    }
    if (proyecto.estado === 'ACTIVO') {
      await this.repo.asegurarActividadDelDia?.({
        proyectoId: proyecto.id,
        usuarioId: usuario.id,
        empleadoId: proyecto.jefeProyectoId ?? usuario.empleadoId,
        fecha: hoy.fecha,
        nombre: nombreDefecto,
      });
    }
    const actividades = rango
      ? await this.repo.findPorProyecto(proyecto.id, rango)
      : await this.repo.findPorProyecto(proyecto.id);
    return {
      actividades,
      filtros: {
        proyectoNombre: proyecto.nombre,
        fechaInicio: fechaInicioIso,
        fechaFin: fechaFinIso,
      },
    };
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
      (!usuario.empleadoId ||
        actividad.proyecto.jefeProyectoId !== usuario.empleadoId)
    ) {
      throw new ForbiddenException(
        'Solo el jefe de proyecto asignado puede consultar esta actividad.',
      );
    }
    return actividad;
  }

  private normalizarCamposActividad(dto: {
    nombre?: string;
    descripcion?: string;
  }): { nombre: string; descripcion: string } {
    const nombre = dto.nombre?.trim() ?? '';
    const descripcion = dto.descripcion?.trim() ?? '';
    const errores: Record<string, string[]> = {};

    if (!nombre) {
      errores.nombre = ['Ingresa el nombre de la actividad.'];
    }
    if (!descripcion) {
      errores.descripcion = ['Ingresa la descripción de la actividad.'];
    }

    if (Object.keys(errores).length > 0) {
      throw new BadRequestException({
        message: errores,
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    return { nombre, descripcion };
  }

  async registrar(dto: CrearActividadDiariaDto, usuarioId: number) {
    const { nombre, descripcion } = this.normalizarCamposActividad(dto);

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
    const proyectoValido = this.validarProyectoDisponible(
      proyecto,
      usuario,
      'Solo el jefe de proyecto asignado puede registrar actividades diarias.',
    );

    const observaciones = dto.observaciones?.trim() || undefined;
    const datosRegistro = {
      claveOperacion: dto.claveOperacion,
      proyectoId: proyectoValido.id,
      usuarioId: usuario.id,
      empleadoId: usuario.empleadoId,
      fecha,
      nombre,
      descripcion,
      observaciones,
    };

    try {
      const pendienteDia = await this.repo.findPendienteDelDia?.(
        proyectoValido.id,
        fecha,
      );
      if (pendienteDia && this.repo.completarPendiente) {
        const actividad = await this.repo.completarPendiente(
          pendienteDia.id,
          datosRegistro,
        );
        return { actividad, repetido: false };
      }
      const actividad = await this.repo.crear(datosRegistro);
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
    const { nombre, descripcion } = this.normalizarCamposActividad(dto);

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
      if (!esJefe) {
        throw new ForbiddenException(
          'Solo el jefe de proyecto asignado puede editar este registro.',
        );
      }

      const yaEstabaGuardada = actividad.descripcion.trim().length > 0;
      const diferenciaMs = Date.now() - new Date(actividad.createdAt).getTime();
      if (yaEstabaGuardada && diferenciaMs >= PLAZO_EDICION_MS) {
        throw new ForbiddenException(
          'El plazo de 48 horas para editar este registro ha vencido. Solo administración puede editarlo.',
        );
      }
    }

    let proyectoIdActualizado: number | undefined;
    if (
      dto.proyectoId !== undefined &&
      dto.proyectoId !== actividad.proyectoId
    ) {
      const proyectoDestino = this.validarProyectoDisponible(
        await this.repo.findProyecto(dto.proyectoId),
        usuario,
        'Solo el jefe de proyecto asignado puede asociar el registro a ese proyecto.',
      );
      proyectoIdActualizado = proyectoDestino.id;
    }

    const observaciones = dto.observaciones?.trim() || null;

    return this.repo.actualizar(id, {
      ...(proyectoIdActualizado !== undefined
        ? { proyectoId: proyectoIdActualizado }
        : {}),
      fecha,
      nombre,
      descripcion,
      observaciones,
    });
  }

  private validarProyectoDisponible<
    T extends { estado: string; jefeProyectoId: number | null },
  >(
    proyecto: T | null,
    usuario: {
      empleadoId: number | null;
      role?: { name?: string | null } | null;
    },
    mensajeSinPermiso: string,
  ): T {
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado.');
    }
    if (proyecto.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se pueden registrar o asociar actividades en proyectos activos.',
      );
    }

    const esAdmin = this.esAdministrador(usuario.role?.name);
    if (!esAdmin) {
      const esJefe =
        Boolean(usuario.empleadoId) &&
        proyecto.jefeProyectoId === usuario.empleadoId;
      if (!esJefe) {
        throw new ForbiddenException(mensajeSinPermiso);
      }
    }

    return proyecto;
  }

  private esAdministrador(rolNombre?: string | null): boolean {
    if (!rolNombre) return false;
    const normalizado = rolNombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
    return normalizado === 'administrador' || normalizado === 'administracion';
  }

  private parsearFechaCalendar(valor: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    if (!match) return null;
    const anio = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      fecha.getUTCFullYear() !== anio ||
      fecha.getUTCMonth() !== mes - 1 ||
      fecha.getUTCDate() !== dia
    ) {
      return null;
    }
    return fecha;
  }

  private construirRangoFechas(
    fechaInicioRaw?: string,
    fechaFinRaw?: string,
  ): {
    rango?: { fechaInicio?: Date; fechaFin?: Date };
    fechaInicioIso?: string;
    fechaFinIso?: string;
  } {
    const fechaInicioIso = fechaInicioRaw?.trim() || undefined;
    const fechaFinIso = fechaFinRaw?.trim() || undefined;

    const fechaInicio = fechaInicioIso
      ? this.parsearFechaCalendar(fechaInicioIso)
      : undefined;
    if (fechaInicioIso && !fechaInicio) {
      throw new BadRequestException(
        'La fecha de inicio debe tener formato AAAA-MM-DD válido.',
      );
    }

    const fechaFin = fechaFinIso
      ? this.parsearFechaCalendar(fechaFinIso)
      : undefined;
    if (fechaFinIso && !fechaFin) {
      throw new BadRequestException(
        'La fecha fin debe tener formato AAAA-MM-DD válido.',
      );
    }

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser mayor que la fecha fin.',
      );
    }

    if (!fechaInicio && !fechaFin) {
      return {};
    }

    return {
      rango: {
        ...(fechaInicio ? { fechaInicio } : {}),
        ...(fechaFin ? { fechaFin } : {}),
      },
      fechaInicioIso,
      fechaFinIso,
    };
  }

  private parsearYValidarFecha(valor: string): Date {
    const fecha = this.parsearFechaCalendar(valor);
    if (!fecha) {
      throw new BadRequestException({
        message: {
          fecha: ['Ingresa una fecha válida en formato AAAA-MM-DD.'],
        },
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    const { fecha: hoyNegocio } = this.obtenerFechaActualNegocio();
    if (fecha > hoyNegocio) {
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
