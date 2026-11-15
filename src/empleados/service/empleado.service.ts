import { Empleado, Prisma } from '@gen/prisma/client';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { diasEntre, fechaLocal } from '@/alertas/alert-schedule';
import { CreateEmpleadoDto } from '../dto/createEmpleado';
import { UpdateEmpleadoDto } from '../dto/updateEmpleado';
import { EmpleadoRepository } from '../repository/empleadoRepository';

const ZONA_HORARIA = process.env.ALERTAS_TIME_ZONE || 'America/El_Salvador';

export interface ProyectoBasico {
  id: number;
  nombre: string;
  ubicacion: string | null;
  estado: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
}

export interface JefeProyectoInfo {
  nombreCompleto: string;
  user: { email: string | null } | null;
}

export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';

export type ItemMiAsignacion = ProyectoBasico & {
  vista: boolean;
  vistaAt: Date | null;
  esJefe: boolean;
  prioridad: Prioridad;
};

// Prioridad de una asignación según qué tan cerca está la fecha de inicio
// del proyecto (GPRCIMPER-122, AC1). Sin fecha de inicio, prioridad baja.
// `hoy` se recibe en vez de calcularse aquí para que sea una función pura
// (fácil de probar) y para no repetir Intl.DateTimeFormat por cada ítem.
export function calcularPrioridad(
  fechaInicio: Date | null,
  hoy: string,
): Prioridad {
  if (!fechaInicio) return 'BAJA';
  const inicio = fechaInicio.toISOString().slice(0, 10);
  const diasParaEmpezar = diasEntre(hoy, inicio);
  if (diasParaEmpezar <= 2) return 'ALTA';
  if (diasParaEmpezar <= 7) return 'MEDIA';
  return 'BAJA';
}

function aItemAsignacion(
  proyecto: ProyectoBasico,
  vistaAt: Date | null,
  esJefe: boolean,
  hoy: string,
): ItemMiAsignacion {
  return {
    ...proyecto,
    vista: vistaAt !== null,
    vistaAt,
    esJefe,
    prioridad: calcularPrioridad(proyecto.fechaInicio, hoy),
  };
}

function aContactoJefe(jefeProyecto: JefeProyectoInfo | null) {
  return jefeProyecto
    ? { nombreCompleto: jefeProyecto.nombreCompleto, email: jefeProyecto.user?.email ?? null }
    : null;
}

@Injectable()
export class EmpleadoService {
  constructor(private readonly repo: EmpleadoRepository) {}

  private async validarDocumentosDisponibles({
    dui,
    nit,
  }: Pick<CreateEmpleadoDto, 'dui' | 'nit'>) {
    const conflicts = await this.repo.findDocumentConflicts(dui, nit);
    const message: Record<string, string[]> = {};
    if (conflicts.some((empleado) => empleado.dui === dui)) {
      message.dui = ['El DUI ya está registrado.'];
    }
    if (conflicts.some((empleado) => empleado.nit === nit)) {
      message.nit = ['El NIT ya está registrado.'];
    }
    if (Object.keys(message).length > 0) {
      throw new ConflictException({ message });
    }
  }

  // Crea un empleado nuevo y devuelve el registro creado
  async create(dto: CreateEmpleadoDto): Promise<Empleado> {
    await this.validarDocumentosDisponibles(dto);

    const datosEmpleado = {
      nombreCompleto: dto.nombreCompleto,
      dui: dto.dui,
      nit: dto.nit,
      cargoId: dto.cargoId,
      activo: dto.activo ?? true,
    };

    try {
      return await this.repo.create(datosEmpleado, dto.habilidadesIds);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Si hubo otra creación simultánea, la misma validación da el error por campo.
        await this.validarDocumentosDisponibles(dto);
      }
      throw error;
    }
  }

  // Lista todos los empleados
  async findAll(): Promise<Empleado[]> {
    return this.repo.findMany();
  }

  // Panel de asignaciones por empleado: proyecto(s) activos y carga actual (GPRCIMPER-83)
  async findAsignaciones() {
    const empleados = await this.repo.findAsignaciones();
    return empleados.map((empleado) => {
      // Un mismo proyecto puede aparecer como técnico y como jefe a la vez,
      // así que se agrupan por proyecto y se acumulan los roles.
      const porProyecto = new Map<
        number,
        { id: number; nombre: string; estado: string; roles: Set<'TECNICO' | 'JEFE'> }
      >();
      for (const { proyecto } of empleado.proyectos) {
        const entry =
          porProyecto.get(proyecto.id) ?? { ...proyecto, roles: new Set() };
        entry.roles.add('TECNICO');
        porProyecto.set(proyecto.id, entry);
      }
      for (const proyecto of empleado.proyectosComoJefe) {
        const entry =
          porProyecto.get(proyecto.id) ?? { ...proyecto, roles: new Set() };
        entry.roles.add('JEFE');
        porProyecto.set(proyecto.id, entry);
      }
      const proyectos = [...porProyecto.values()].map(
        ({ roles, ...proyecto }) => ({ ...proyecto, roles: [...roles] }),
      );
      const cargaHoraria = proyectos.length;
      return {
        empleadoId: empleado.id,
        nombreCompleto: empleado.nombreCompleto,
        cargo: empleado.cargo?.nombre ?? null,
        activo: empleado.activo,
        proyectos,
        cargaHoraria,
        sobreasignado: cargaHoraria > 1,
      };
    });
  }

  private async resolveEmpleadoId(userId: number): Promise<number> {
    const usuario = await this.repo.findEmpleadoIdPorUsuario(userId);
    if (!usuario?.empleadoId) {
      throw new ForbiddenException('Tu usuario no está vinculado a un empleado.');
    }
    return usuario.empleadoId;
  }

  // Lista de proyectos asignados al técnico autenticado, con contador de
  // pendientes por visualizar (GPRCIMPER-122). Un empleado que además es
  // jefe de proyecto de alguna obra (o solo jefe, sin ser técnico) también
  // debe verla aquí — esos proyectos no pasan por la tabla pivote de
  // técnicos, así que se combinan ambas fuentes por id de proyecto.
  async misAsignaciones(userId: number) {
    const empleadoId = await this.resolveEmpleadoId(userId);
    const [asignaciones, proyectosComoJefe] = await Promise.all([
      this.repo.findMisAsignaciones(empleadoId),
      this.repo.findMisProyectosComoJefe(empleadoId),
    ]);

    const hoy = fechaLocal(new Date(), ZONA_HORARIA);
    const jefeIds = new Set(proyectosComoJefe.map((proyecto) => proyecto.id));
    const porId = new Map<number, ItemMiAsignacion>();

    for (const { proyecto, vistaAt } of asignaciones) {
      porId.set(
        proyecto.id,
        aItemAsignacion(proyecto, vistaAt, jefeIds.has(proyecto.id), hoy),
      );
    }
    for (const proyecto of proyectosComoJefe) {
      if (porId.has(proyecto.id)) continue; // ya viene como técnico
      // Sin fila en proyecto_empleados no hay vistaAt que rastrear: se
      // considera siempre "vista" para no mostrar un pendiente que nunca
      // se puede marcar como leído.
      porId.set(proyecto.id, aItemAsignacion(proyecto, new Date(), true, hoy));
    }

    const items = [...porId.values()];
    return {
      items,
      pendientes: items.filter((item) => !item.vista).length,
    };
  }

  // Detalle de una asignación propia. No marca la visualización por sí
  // sola: el frontend llama a marcarVista al abrir el detalle. Si el
  // empleado no es técnico en el proyecto, se intenta como jefe antes de
  // dar 404 (GPRCIMPER-122).
  async miAsignacionDetalle(userId: number, proyectoId: number) {
    const empleadoId = await this.resolveEmpleadoId(userId);
    const hoy = fechaLocal(new Date(), ZONA_HORARIA);
    const asignacion = await this.repo.findMiAsignacionDetalle(
      empleadoId,
      proyectoId,
    );
    if (asignacion) {
      const { proyecto, vistaAt } = asignacion;
      const { jefeProyecto, jefeProyectoId, ...datosProyecto } = proyecto;
      return {
        ...datosProyecto,
        vista: vistaAt !== null,
        vistaAt,
        esJefe: jefeProyectoId === empleadoId,
        prioridad: calcularPrioridad(datosProyecto.fechaInicio, hoy),
        jefeProyecto: aContactoJefe(jefeProyecto),
      };
    }

    const proyectoComoJefe = await this.repo.findMiProyectoComoJefe(
      empleadoId,
      proyectoId,
    );
    if (!proyectoComoJefe) {
      throw new NotFoundException(
        'No tienes una asignación vigente en este proyecto.',
      );
    }
    const { jefeProyecto, ...datosProyecto } = proyectoComoJefe;
    return {
      ...datosProyecto,
      vista: true,
      vistaAt: null,
      esJefe: true,
      prioridad: calcularPrioridad(datosProyecto.fechaInicio, hoy),
      jefeProyecto: aContactoJefe(jefeProyecto),
    };
  }

  // Marca la asignación como "Vista" con fecha/hora exacta, la primera vez
  // que el técnico abre el detalle (GPRCIMPER-122). Si el empleado solo es
  // jefe de proyecto en esa obra no hay fila de técnico que marcar: ya se
  // considera "vista" (ver miAsignacionDetalle), así que no hace nada.
  async marcarAsignacionVista(userId: number, proyectoId: number) {
    const empleadoId = await this.resolveEmpleadoId(userId);
    const asignacion = await this.repo.findMiAsignacionDetalle(
      empleadoId,
      proyectoId,
    );
    if (!asignacion) {
      const proyectoComoJefe = await this.repo.findMiProyectoComoJefe(
        empleadoId,
        proyectoId,
      );
      if (!proyectoComoJefe) {
        throw new NotFoundException(
          'No tienes una asignación vigente en este proyecto.',
        );
      }
      return { vista: true };
    }
    await this.repo.marcarAsignacionVista(empleadoId, proyectoId);
    return { vista: true };
  }

  // Obtiene un empleado por id; lanza NotFoundException si no existe
  async findOne(id: number): Promise<Empleado> {
    const empleado = await this.repo.findUnique(id);
    if (!empleado) {
      throw new NotFoundException(`Empleado #${id} no encontrado`);
    }
    return empleado;
  }

  // Actualiza un empleado existente
  async update(
    id: number,
    updateEmpleadoDto: UpdateEmpleadoDto,
  ): Promise<Empleado> {
    await this.findOne(id); // aseguramos que existe
    // Solo enviamos campos editables; cargo y habilidades del GET son relaciones.
    return this.repo.update(
      id,
      {
        nombreCompleto: updateEmpleadoDto.nombreCompleto,
        dui: updateEmpleadoDto.dui,
        nit: updateEmpleadoDto.nit,
        cargoId: updateEmpleadoDto.cargoId,
        activo: updateEmpleadoDto.activo,
      },
      updateEmpleadoDto.habilidadesIds,
    );
  }

  async updateHabilidades(id: number, habilidadesIds: number[]) {
    await this.findOne(id);
    return this.repo.update(id, {}, habilidadesIds);
  }

  // Elimina un empleado y devuelve el registro eliminado
  async remove(id: number): Promise<Empleado> {
    const empleado = await this.findOne(id);
    await this.repo.delete(id);
    return empleado;
  }
}
