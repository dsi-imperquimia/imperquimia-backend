import { Prisma } from '@gen/prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AbrirJornadaHerramientasDto } from '../dto/abrir-jornada-herramientas.dto';
import { VerificarItemInicioDto } from '../dto/verificar-item-inicio.dto';
import { JornadaHerramientasRepository } from '../repository/jornada-herramientas.repository';

type UsuarioAcceso = {
  empleadoId: number | null;
  role?: { name?: string | null } | null;
};

@Injectable()
export class JornadaHerramientasService {
  constructor(private readonly repo: JornadaHerramientasRepository) {}

  async abrir(dto: AbrirJornadaHerramientasDto, usuarioId: number) {
    const usuario = await this.obtenerUsuario(usuarioId);

    const existentePorClave = await this.repo.findByClave(dto.claveOperacion);
    if (existentePorClave) {
      if (existentePorClave.creadoPorId !== usuarioId) {
        throw new ConflictException(
          'La clave de operación ya fue utilizada en otro registro.',
        );
      }
      return { jornada: existentePorClave, repetido: true };
    }

    const proyecto = await this.repo.findProyecto(dto.proyectoId);
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado.');
    }
    this.validarAcceso(
      usuario,
      proyecto.jefeProyectoId,
      'Solo el jefe de proyecto asignado puede verificar herramientas de este proyecto.',
    );

    const asignacion = await this.repo.asignacionVigente(
      proyecto.id,
      dto.empleadoId,
    );
    if (!asignacion) {
      throw new BadRequestException(
        'El técnico no tiene una asignación vigente en este proyecto.',
      );
    }

    const fecha = this.parsearYValidarFecha(dto.fecha);

    const existentePorUnique = await this.repo.findByUnique(
      proyecto.id,
      dto.empleadoId,
      fecha,
    );
    if (existentePorUnique) {
      return { jornada: existentePorUnique, repetido: true };
    }

    const herramientas = await this.repo.herramientasDespachadas(proyecto.id);
    if (herramientas.length === 0) {
      throw new BadRequestException(
        'Este proyecto no tiene herramientas despachadas para verificar.',
      );
    }

    try {
      const jornada = await this.repo.crear({
        claveOperacion: dto.claveOperacion,
        proyectoId: proyecto.id,
        empleadoId: dto.empleadoId,
        fecha,
        creadoPorId: usuarioId,
        herramientaIds: herramientas.map((h) => h.id),
      });
      return { jornada, repetido: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrente = await this.repo.findByClave(dto.claveOperacion);
        if (concurrente && concurrente.creadoPorId === usuarioId) {
          return { jornada: concurrente, repetido: true };
        }
        const porUnique = await this.repo.findByUnique(
          proyecto.id,
          dto.empleadoId,
          fecha,
        );
        if (porUnique) {
          return { jornada: porUnique, repetido: true };
        }
        throw new ConflictException(
          'Ya existe un checklist de herramientas para ese técnico en esa fecha.',
        );
      }
      throw error;
    }
  }

  async obtener(
    proyectoId: number,
    empleadoId: number,
    fechaIso: string,
    usuarioId: number,
  ) {
    const usuario = await this.obtenerUsuario(usuarioId);
    const fecha = this.parsearYValidarFecha(fechaIso);
    const jornada = await this.repo.findByUnique(proyectoId, empleadoId, fecha);
    if (!jornada) {
      throw new NotFoundException(
        'No hay un checklist de herramientas abierto para ese técnico en esa fecha.',
      );
    }
    this.validarAcceso(
      usuario,
      jornada.proyecto.jefeProyectoId,
      'Solo el jefe de proyecto asignado puede consultar este checklist.',
    );
    return jornada;
  }

  async findOne(id: number, usuarioId: number) {
    const usuario = await this.obtenerUsuario(usuarioId);
    const jornada = await this.repo.findById(id);
    if (!jornada) {
      throw new NotFoundException('El checklist de herramientas no existe.');
    }
    this.validarAcceso(
      usuario,
      jornada.proyecto.jefeProyectoId,
      'Solo el jefe de proyecto asignado puede consultar este checklist.',
    );
    return jornada;
  }

  async verificarItemInicio(
    jornadaId: number,
    itemId: number,
    dto: VerificarItemInicioDto,
    usuarioId: number,
  ) {
    const jornada = await this.findOne(jornadaId, usuarioId);
    if (jornada.verificacionInicioAt) {
      throw new ConflictException(
        'La verificación de inicio de esta jornada ya fue confirmada.',
      );
    }
    const item = jornada.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(
        'Esa herramienta no pertenece a este checklist.',
      );
    }

    const observacion = dto.observacion?.trim() || null;
    if (dto.estado === 'AUSENTE' && !observacion) {
      throw new BadRequestException(
        'Indica una observación al marcar la herramienta como ausente.',
      );
    }

    await this.repo.actualizarItemInicio(itemId, dto.estado, observacion);
    return this.findOne(jornadaId, usuarioId);
  }

  async confirmarInicio(jornadaId: number, usuarioId: number) {
    const jornada = await this.findOne(jornadaId, usuarioId);
    if (jornada.verificacionInicioAt) {
      throw new ConflictException(
        'La verificación de inicio de esta jornada ya fue confirmada.',
      );
    }
    const pendientes = jornada.items.filter(
      (i) => i.estadoInicio === 'PENDIENTE',
    );
    if (pendientes.length > 0) {
      throw new BadRequestException({
        message:
          'Hay herramientas sin verificar ni marcar como ausentes. Revisa el checklist antes de cerrar la verificación.',
        herramientasPendientes: pendientes.map((i) => ({
          itemId: i.id,
          herramientaId: i.herramienta.id,
          codigoUnico: i.herramienta.codigoUnico,
          nombre: i.herramienta.nombre,
        })),
        error: 'Bad Request',
        statusCode: 400,
      });
    }
    return this.repo.confirmarInicio(jornadaId);
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
    return fecha;
  }
}
