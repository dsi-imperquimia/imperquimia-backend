import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  AccionAuditoriaAlerta,
  EstadoNotificacionAlerta,
  FrecuenciaAlerta,
  Prisma,
} from '@gen/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/common/mail/mail.service';
import { ActualizarConfiguracionAlertaDto } from './dto/actualizar-configuracion-alerta.dto';
import { CrearConfiguracionAlertaDto } from './dto/crear-configuracion-alerta.dto';
import { CrearNotificacionAlertaDto } from './dto/crear-notificacion-alerta.dto';
import { debeGenerarse, fechaLocal, restarDias } from './alert-schedule';

const ZONA_HORARIA = process.env.ALERTAS_TIME_ZONE || 'America/El_Salvador';
// Reglas implícitas de vencimiento de proyecto (GPRCIMPER-26): no requieren
// que un administrador cree una ConfiguracionAlerta manualmente, aplican a
// todo proyecto activo con fecha de fin. Se identifican con un reglaId
// negativo para que el índice único (reglaId, proyectoId, destinatarioId,
// ultimaFechaProgramada) las deduplique igual que a las reglas configuradas,
// sin colisionar con los id autoincrementales de ConfiguracionAlerta.
const DIAS_ANTES_VENCIMIENTO_PROYECTO = 7;
const REGLA_PROYECTO_PROXIMO_VENCER = -1;
const REGLA_PROYECTO_VENCIDO = -2;
const PROYECTO_CONFIG_SELECT = {
  id: true,
  nombre: true,
  estado: true,
  fechaFin: true,
} as const;
const NOTIFICACION_PERSONAS_INCLUDE = {
  destinatario: {
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      empleado: { select: { nombreCompleto: true } },
    },
  },
  creadaPor: { select: { id: true, name: true, lastName: true } },
} as const;

@Injectable()
export class AlertasService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertasService.name);
  private timer?: NodeJS.Timeout;
  private procesando = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async proyectosDisponibles(usuarioId: number) {
    const usuario = await this.prisma.user.findFirst({
      where: { id: usuarioId, deletedAt: null },
      select: { empleadoId: true, role: { select: { name: true } } },
    });
    if (!usuario) throw new ForbiddenException('Usuario no disponible.');
    const esAdmin = usuario.role?.name.toLocaleLowerCase() === 'administrador';
    const proyectos = await this.prisma.proyecto.findMany({
      where: {
        deletedAt: null,
        estado: 'ACTIVO',
        ...(esAdmin ? {} : { jefeProyectoId: usuario.empleadoId ?? -1 }),
      },
      include: {
        empleados: {
          where: { fechaRetiro: null, empleado: { activo: true } },
          include: {
            empleado: {
              include: { user: true, cargo: { select: { nombre: true } } },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return proyectos.map((proyecto) => ({
      id: proyecto.id,
      nombre: proyecto.nombre,
      fechaFin: proyecto.fechaFin,
      empleados: proyecto.empleados.flatMap(({ empleado }) => {
        const user = empleado.user;
        return [
          {
            id: empleado.id,
            nombreCompleto: empleado.nombreCompleto,
            cargo: empleado.cargo?.nombre ?? null,
            tieneUsuarioActivo: Boolean(user && !user.deletedAt),
          },
        ];
      }),
    }));
  }

  async crearNotificacion(dto: CrearNotificacionAlertaDto, usuarioId: number) {
    const [usuario, proyecto] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: usuarioId, deletedAt: null },
        select: { empleadoId: true, role: { select: { name: true } } },
      }),
      this.prisma.proyecto.findFirst({
        where: { id: dto.proyectoId, deletedAt: null, estado: 'ACTIVO' },
        include: {
          empleados: {
            where: { fechaRetiro: null, empleado: { activo: true } },
            include: {
              empleado: {
                include: { user: true, cargo: { select: { nombre: true } } },
              },
            },
          },
        },
      }),
    ]);
    if (!usuario) throw new ForbiddenException('Usuario no disponible.');
    if (!proyecto)
      throw new NotFoundException('Proyecto activo no encontrado.');

    const esAdmin = usuario.role?.name.toLocaleLowerCase() === 'administrador';
    if (!esAdmin && proyecto.jefeProyectoId !== usuario.empleadoId) {
      throw new ForbiddenException(
        'Solo el jefe asignado al proyecto o un administrador puede crear alertas.',
      );
    }

    const asignadosActivos = proyecto.empleados.flatMap(({ empleado }) => {
      const user = empleado.user;
      return user && !user.deletedAt
        ? [
            {
              empleadoId: empleado.id,
              userId: user.id,
              nombreCompleto: empleado.nombreCompleto,
            },
          ]
        : [];
    });
    if (!proyecto.empleados.length) {
      throw new BadRequestException(
        'El proyecto no tiene empleados activos asignados. Asigna personal antes de enviar alertas.',
      );
    }
    if (!asignadosActivos.length) {
      throw new BadRequestException(
        'Los empleados asignados no tienen una cuenta de usuario activa vinculada. Crea o vincula sus cuentas para que puedan recibir alertas.',
      );
    }
    const idsSolicitados = dto.empleadoIds ?? [];
    if (!dto.todosAsignados && idsSolicitados.length === 0) {
      throw new BadRequestException(
        'Selecciona uno o más empleados, o elige enviar a todos los asignados.',
      );
    }
    const destinatarios = dto.todosAsignados
      ? asignadosActivos
      : asignadosActivos.filter(({ empleadoId }) =>
          idsSolicitados.includes(empleadoId),
        );
    if (
      !dto.todosAsignados &&
      destinatarios.length !== new Set(idsSolicitados).size
    ) {
      throw new BadRequestException(
        'Todos los destinatarios deben ser empleados activos asignados al proyecto y tener usuario.',
      );
    }

    const nombre = dto.nombre.trim();
    const descripcion = dto.descripcion.trim();
    const ahora = new Date();
    const fechaHoy = fechaLocal(ahora, ZONA_HORARIA);
    await this.prisma.$transaction(async (tx) => {
      await tx.notificacionAlerta.createMany({
        data: destinatarios.map((destinatario) => ({
          reglaId: null,
          configuracionId: null,
          proyectoId: proyecto.id,
          destinatarioId: destinatario.userId,
          creadaPorId: usuarioId,
          nombreConfiguracion: nombre,
          nombreProyecto: proyecto.nombre,
          descripcion,
          primeraGeneracion: ahora,
          ultimaGeneracion: ahora,
          ultimaFechaProgramada: new Date(`${fechaHoy}T00:00:00.000Z`),
        })),
      });
      await tx.auditoriaAlerta.create({
        data: {
          usuarioId,
          accion: AccionAuditoriaAlerta.CREADA,
          datos: JSON.stringify({
            tipo: 'NOTIFICACION_MANUAL',
            proyectoId: proyecto.id,
            nombreProyecto: proyecto.nombre,
            nombre,
            descripcion,
            todosAsignados: dto.todosAsignados,
            destinatarios: destinatarios.map(
              ({ empleadoId, userId, nombreCompleto }) => ({
                empleadoId,
                usuarioId: userId,
                nombre: nombreCompleto,
              }),
            ),
          }),
        },
      });
    });
    return {
      mensaje: `Alerta enviada a ${destinatarios.length} empleado(s) asignado(s).`,
    };
  }

  onModuleInit() {
    void this.generarAutomaticamente();
    this.timer = setInterval(() => void this.generarAutomaticamente(), 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async crear(dto: CrearConfiguracionAlertaDto, usuarioId: number) {
    this.validarFrecuencia(dto);
    const proyecto = await this.prisma.proyecto.findFirst({
      where: { id: dto.proyectoId, deletedAt: null },
      select: { id: true, fechaFin: true },
    });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado.');
    if (!proyecto.fechaFin) {
      throw new BadRequestException(
        'El proyecto debe tener fecha de finalización.',
      );
    }

    const configuracion = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.configuracionAlerta.create({
        data: {
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
          proyectoId: dto.proyectoId,
          diasAntes: dto.diasAntes,
          canal: dto.canal,
          frecuencia: dto.frecuencia,
          cadaNDias:
            dto.frecuencia === FrecuenciaAlerta.CADA_N_DIAS
              ? dto.cadaNDias
              : null,
          diasEspecificos:
            dto.frecuencia === FrecuenciaAlerta.DIAS_ESPECIFICOS
              ? (dto.diasEspecificos ?? [])
              : [],
          activa: dto.activa ?? true,
          creadoPorId: usuarioId,
        },
        include: { proyecto: { select: PROYECTO_CONFIG_SELECT } },
      });
      await tx.auditoriaAlerta.create({
        data: {
          configuracionId: creada.id,
          usuarioId,
          accion: AccionAuditoriaAlerta.CREADA,
          datos: JSON.stringify({ despues: creada }),
        },
      });
      return creada;
    });
    await this.generarAutomaticamente();
    return configuracion;
  }

  listarConfiguraciones() {
    return this.prisma.configuracionAlerta.findMany({
      where: { deletedAt: null },
      include: { proyecto: { select: PROYECTO_CONFIG_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detalleConfiguracion(id: number) {
    const configuracion = await this.prisma.configuracionAlerta.findFirst({
      where: { id, deletedAt: null },
      include: { proyecto: { select: PROYECTO_CONFIG_SELECT } },
    });
    if (!configuracion) {
      throw new NotFoundException('Configuración de alerta no encontrada.');
    }
    return configuracion;
  }

  async actualizar(
    id: number,
    dto: ActualizarConfiguracionAlertaDto,
    usuarioId: number,
  ) {
    const actual = await this.detalleConfiguracion(id);
    const siguiente = { ...actual, ...dto };
    this.validarFrecuencia(siguiente);

    if (dto.proyectoId !== undefined || dto.activa === true) {
      const proyecto = await this.prisma.proyecto.findFirst({
        where: { id: siguiente.proyectoId, deletedAt: null },
        select: { id: true, fechaFin: true },
      });
      if (!proyecto) throw new NotFoundException('Proyecto no encontrado.');
      if (!proyecto.fechaFin) {
        throw new BadRequestException(
          'El proyecto debe tener fecha de finalización.',
        );
      }
    }

    const data: Prisma.ConfiguracionAlertaUpdateInput = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined) {
      data.descripcion = dto.descripcion.trim() || null;
    }
    if (dto.proyectoId !== undefined) {
      data.proyecto = { connect: { id: dto.proyectoId } };
    }
    if (dto.diasAntes !== undefined) data.diasAntes = dto.diasAntes;
    if (dto.canal !== undefined) data.canal = dto.canal;
    if (dto.frecuencia !== undefined) data.frecuencia = dto.frecuencia;
    if (dto.cadaNDias !== undefined || dto.frecuencia !== undefined) {
      data.cadaNDias =
        siguiente.frecuencia === FrecuenciaAlerta.CADA_N_DIAS
          ? siguiente.cadaNDias
          : null;
    }
    if (dto.diasEspecificos !== undefined || dto.frecuencia !== undefined) {
      data.diasEspecificos =
        siguiente.frecuencia === FrecuenciaAlerta.DIAS_ESPECIFICOS
          ? (siguiente.diasEspecificos ?? [])
          : [];
    }
    if (dto.activa !== undefined) data.activa = dto.activa;

    const actualizada = await this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.configuracionAlerta.update({
        where: { id },
        data,
        include: { proyecto: { select: PROYECTO_CONFIG_SELECT } },
      });
      await tx.auditoriaAlerta.create({
        data: {
          configuracionId: id,
          usuarioId,
          accion: AccionAuditoriaAlerta.EDITADA,
          datos: JSON.stringify({ antes: actual, despues: actualizada }),
        },
      });
      return actualizada;
    });
    await this.generarAutomaticamente();
    return actualizada;
  }

  async eliminar(id: number, usuarioId: number) {
    const actual = await this.detalleConfiguracion(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.auditoriaAlerta.create({
        data: {
          configuracionId: id,
          usuarioId,
          accion: AccionAuditoriaAlerta.ELIMINADA,
          datos: JSON.stringify({ antes: actual }),
        },
      });
      await tx.configuracionAlerta.update({
        where: { id },
        data: { deletedAt: new Date(), activa: false },
      });
    });
    return { mensaje: 'Configuración eliminada.' };
  }

  async historial(id: number) {
    const existe = await this.prisma.auditoriaAlerta.findFirst({
      where: { configuracionId: id },
    });
    if (!existe) {
      throw new NotFoundException(
        'No existe historial para esta configuración.',
      );
    }
    return this.prisma.auditoriaAlerta.findMany({
      where: { configuracionId: id },
      include: {
        usuario: {
          select: { id: true, name: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listarAuditoria() {
    return this.prisma.auditoriaAlerta.findMany({
      include: {
        configuracion: {
          select: {
            id: true,
            nombre: true,
            proyecto: { select: { id: true, nombre: true } },
          },
        },
        usuario: {
          select: { id: true, name: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async listarNotificaciones(usuarioId: number, page = 1, pageSize = 10) {
    const pagina = Math.max(1, Math.floor(page));
    const tamanoPagina = Math.min(50, Math.max(1, Math.floor(pageSize)));
    const where: Prisma.NotificacionAlertaWhereInput = {
      OR: [{ destinatarioId: usuarioId }, { creadaPorId: usuarioId }],
    };
    const [notificaciones, total] = await Promise.all([
      this.prisma.notificacionAlerta.findMany({
        where,
        include: NOTIFICACION_PERSONAS_INCLUDE,
        orderBy: [
          { ultimaFechaProgramada: 'desc' },
          { ultimaGeneracion: 'desc' },
          { id: 'desc' },
        ],
        skip: (pagina - 1) * tamanoPagina,
        take: tamanoPagina,
      }),
      this.prisma.notificacionAlerta.count({ where }),
    ]);
    return {
      items: notificaciones.map((notificacion) => ({
        ...notificacion,
        esDestinatario: notificacion.destinatarioId === usuarioId,
      })),
      total,
      page: pagina,
      pageSize: tamanoPagina,
      totalPages: Math.ceil(total / tamanoPagina),
    };
  }

  contarNoLeidas(usuarioId: number) {
    return this.prisma.notificacionAlerta.count({
      where: {
        destinatarioId: usuarioId,
        estado: EstadoNotificacionAlerta.NUEVA,
      },
    });
  }

  async detalleNotificacion(id: number, usuarioId: number) {
    const notificacion = await this.prisma.notificacionAlerta.findFirst({
      where: {
        id,
        OR: [{ destinatarioId: usuarioId }, { creadaPorId: usuarioId }],
      },
      include: NOTIFICACION_PERSONAS_INCLUDE,
    });
    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada.');
    }
    return {
      ...notificacion,
      esDestinatario: notificacion.destinatarioId === usuarioId,
    };
  }

  async visualizar(id: number, usuarioId: number) {
    const notificacion = await this.prisma.notificacionAlerta.findFirst({
      where: { id, destinatarioId: usuarioId },
      include: NOTIFICACION_PERSONAS_INCLUDE,
    });
    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada.');
    }
    if (notificacion.estado === EstadoNotificacionAlerta.ATENDIDA) {
      return { ...notificacion, esDestinatario: true };
    }
    const actualizada = await this.prisma.notificacionAlerta.update({
      where: { id, destinatarioId: usuarioId },
      data: {
        estado: EstadoNotificacionAlerta.VISUALIZADA,
        visualizadaAt: new Date(),
      },
      include: NOTIFICACION_PERSONAS_INCLUDE,
    });
    return { ...actualizada, esDestinatario: true };
  }

  async atender(id: number, usuarioId: number) {
    const existe = await this.prisma.notificacionAlerta.findFirst({
      where: { id, destinatarioId: usuarioId },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException('Notificación no encontrada.');
    }
    const actualizada = await this.prisma.notificacionAlerta.update({
      where: { id, destinatarioId: usuarioId },
      data: {
        estado: EstadoNotificacionAlerta.ATENDIDA,
        atendidaAt: new Date(),
      },
      include: NOTIFICACION_PERSONAS_INCLUDE,
    });
    return { ...actualizada, esDestinatario: true };
  }

  async generarAutomaticamente(now = new Date()) {
    if (this.procesando) return;
    this.procesando = true;
    try {
      const hoy = fechaLocal(now, ZONA_HORARIA);
      const configuraciones = await this.prisma.configuracionAlerta.findMany({
        where: {
          activa: true,
          deletedAt: null,
          proyecto: {
            estado: 'ACTIVO',
            deletedAt: null,
            fechaFin: { not: null },
          },
        },
        include: {
          proyecto: {
            include: {
              empleados: {
                where: { fechaRetiro: null, empleado: { activo: true } },
                include: {
                  empleado: {
                    include: { user: true },
                  },
                },
              },
              jefeProyecto: {
                include: { user: true },
              },
            },
          },
        },
      });

      for (const configuracion of configuraciones) {
        const fechaFin = configuracion.proyecto
          .fechaFin!.toISOString()
          .slice(0, 10);
        if (hoy > fechaFin) continue;
        const usuariosAsignados = configuracion.proyecto.empleados.flatMap(
          ({ empleado }) => {
            const user = empleado.user;
            return user && !user.deletedAt ? [user] : [];
          },
        );
        const jefe = configuracion.proyecto.jefeProyecto;
        if (
          jefe?.activo &&
          !jefe.deletedAt &&
          jefe.user &&
          !jefe.user.deletedAt
        ) {
          usuariosAsignados.push(jefe.user);
        }
        const destinatarios = [
          ...new Map(usuariosAsignados.map((user) => [user.id, user])).values(),
        ];

        for (const destinatario of destinatarios) {
          const existente = await this.prisma.notificacionAlerta.findFirst({
            where: {
              configuracionId: configuracion.id,
              proyectoId: configuracion.proyectoId,
              destinatarioId: destinatario.id,
            },
            select: { id: true },
          });
          if (
            !debeGenerarse(configuracion, fechaFin, hoy, existente !== null)
          ) {
            continue;
          }

          try {
            await this.prisma.notificacionAlerta.create({
              data: {
                configuracionId: configuracion.id,
                reglaId: configuracion.id,
                proyectoId: configuracion.proyectoId,
                destinatarioId: destinatario.id,
                creadaPorId: configuracion.creadoPorId,
                nombreConfiguracion: configuracion.nombre,
                nombreProyecto: configuracion.proyecto.nombre,
                descripcion: configuracion.descripcion,
                primeraGeneracion: now,
                ultimaGeneracion: now,
                ultimaFechaProgramada: new Date(`${hoy}T00:00:00.000Z`),
              },
            });
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              continue;
            }
            throw error;
          }
        }
      }

      await this.generarAlertasVencimientoProyecto(now, hoy);
    } catch (error) {
      this.logger.error(
        'No se pudieron generar las alertas automáticas.',
        error,
      );
    } finally {
      this.procesando = false;
    }
  }

  // Alerta de vencimiento de proyecto (GPRCIMPER-26): a diferencia de las
  // ConfiguracionAlerta de arriba (manuales, por proyecto, dirigidas a jefe
  // y empleados asignados), esta regla es automática para todo proyecto
  // activo con fecha de fin y notifica a los administradores, por sistema y
  // por correo, tal como pide el criterio de aceptación del ticket.
  private async generarAlertasVencimientoProyecto(now: Date, hoy: string) {
    const proyectos = await this.prisma.proyecto.findMany({
      where: { deletedAt: null, estado: 'ACTIVO', fechaFin: { not: null } },
      select: { id: true, nombre: true, fechaFin: true },
    });
    if (!proyectos.length) return;

    const administradores = await this.prisma.user.findMany({
      where: { deletedAt: null, role: { name: 'Administrador' } },
      select: { id: true, email: true },
    });
    if (!administradores.length) return;

    for (const proyecto of proyectos) {
      const fechaFin = proyecto.fechaFin!.toISOString().slice(0, 10);
      const vencido = hoy > fechaFin;
      const proximoAVencer =
        !vencido &&
        hoy >= restarDias(fechaFin, DIAS_ANTES_VENCIMIENTO_PROYECTO);
      if (!vencido && !proximoAVencer) continue;

      const reglaId = vencido
        ? REGLA_PROYECTO_VENCIDO
        : REGLA_PROYECTO_PROXIMO_VENCER;
      const nombreConfiguracion = vencido
        ? 'Proyecto vencido'
        : 'Proyecto próximo a vencer';
      const descripcion = vencido
        ? `El proyecto "${proyecto.nombre}" venció el ${fechaFin} y sigue activo.`
        : `El proyecto "${proyecto.nombre}" vence el ${fechaFin} (7 días o menos).`;

      for (const administrador of administradores) {
        const existente = await this.prisma.notificacionAlerta.findFirst({
          where: {
            reglaId,
            proyectoId: proyecto.id,
            destinatarioId: administrador.id,
          },
          select: { id: true },
        });
        if (existente) continue;

        try {
          await this.prisma.notificacionAlerta.create({
            data: {
              reglaId,
              configuracionId: null,
              proyectoId: proyecto.id,
              destinatarioId: administrador.id,
              creadaPorId: null,
              nombreConfiguracion,
              nombreProyecto: proyecto.nombre,
              descripcion,
              primeraGeneracion: now,
              ultimaGeneracion: now,
              ultimaFechaProgramada: new Date(`${hoy}T00:00:00.000Z`),
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            continue;
          }
          throw error;
        }

        if (administrador.email) {
          await this.mail.enviar({
            to: administrador.email,
            subject: `${nombreConfiguracion}: ${proyecto.nombre}`,
            text: descripcion,
          });
        }
      }
    }
  }

  private validarFrecuencia(dto: {
    frecuencia?: FrecuenciaAlerta;
    cadaNDias?: number | null;
    diasEspecificos?: number[];
    canal?: string | null;
  }) {
    if (dto.frecuencia === FrecuenciaAlerta.CADA_N_DIAS && !dto.cadaNDias) {
      throw new BadRequestException(
        'Indica cada cuántos días debe repetirse la alerta.',
      );
    }
    if (
      dto.frecuencia === FrecuenciaAlerta.DIAS_ESPECIFICOS &&
      !dto.diasEspecificos?.length
    ) {
      throw new BadRequestException(
        'Selecciona al menos un día de repetición.',
      );
    }
    if (dto.canal && dto.canal !== 'INTERNA') {
      throw new BadRequestException(
        'El correo electrónico estará disponible en una fase posterior.',
      );
    }
  }
}
