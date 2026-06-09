import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { EmpleadoRepository } from '../repository/empleadoRepository';
import { CreateEmpleadoDto } from '../dto/createEmpleado';
import { UpdateEmpleadoDto } from '../dto/updateEmpleado';
import { Empleado, Prisma } from '@gen/prisma/client';

@Injectable()
export class EmpleadoService {
  prisma: any;
  constructor(private readonly repo: EmpleadoRepository) {}

  // Crea un empleado nuevo y devuelve el registro creado
  async create(createEmpleadoDto: CreateEmpleadoDto) {
    const { habilidadesIds, ...datosEmpleado } = createEmpleadoDto;
   // Usamos una transacción para garantizar consistencia atómica
    return this.repo.prClient.$transaction(async (tx) => {
      const empleado = await tx.empleado.create({
        data: {
          nombreCompleto: datosEmpleado.nombreCompleto,
          dui: datosEmpleado.dui,
          nit: datosEmpleado.nit,
          cargoId: datosEmpleado.cargoId,
          activo: datosEmpleado.activo ?? true,
        },
      });
      if (habilidadesIds && habilidadesIds.length > 0) {
        const registrosHabilidades = habilidadesIds.map((id) => ({
          empleadoId: empleado.id,
          habilidadId: id,
          assignedBy: 'Admin_System', // Aquí puedes recuperar el usuario del JWT en un entorno real
        }));

        await tx.habilidadEmpleado.createMany({
          data: registrosHabilidades,
        });
      }
      return tx.empleado.findUnique({
        where: { id: empleado.id },
        include: { habilidades: { include: { habilidad: true } } },
      });
    });
  }

  // Lista todos los empleados
  async findAll(): Promise<Empleado[]> {
    return this.repo.findMany();
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
  async update(id: number, updateEmpleadoDto: UpdateEmpleadoDto) {
   await this.findOne(id); // Validar existencia
    const { habilidadesIds, ...datosEmpleado } = updateEmpleadoDto;
    return this.repo.prClient.$transaction(async (tx) => {
      // 1. Actualizar datos base del empleado
      await tx.empleado.update({
        where: { id },
        data: {
          nombreCompleto: datosEmpleado.nombreCompleto,
          dui: datosEmpleado.dui,
          nit: datosEmpleado.nit,
          cargoId: datosEmpleado.cargoId,
          activo: datosEmpleado.activo,
        },
      });
      // 2. Si se envió el arreglo de habilidades (así sea vacío), sincronizarlo
      if (habilidadesIds !== undefined) {
        // Eliminar las habilidades previas asignadas
        await tx.habilidadEmpleado.deleteMany({
          where: { empleadoId: id },
        });
        // Insertar el nuevo set de habilidades
        if (habilidadesIds.length > 0) {
          const nuevosRegistros = habilidadesIds.map((hid) => ({
            empleadoId: id,
            habilidadId: hid,
            assignedBy: 'Admin_Actualizador', // Opcional según PBI-90
          }));

          await tx.habilidadEmpleado.createMany({
            data: nuevosRegistros,
          });
        }
      }
      return tx.empleado.findUnique({
        where: { id },
        include: { habilidades: { include: { habilidad: true } } },
      });
    });
  }

  // Elimina un empleado y devuelve el registro eliminado
  async remove(id: number): Promise<Empleado> {
    const empleado = await this.findOne(id);
    // Debido a 'onDelete: Cascade' en el schema de Prisma, 
    // al borrar el empleado se purgarán automáticamente sus relaciones en mnt_habilidad_empleados
    await this.repo.prClient.empleado.delete({ where: { id } });
    return empleado;
  }

   /**
   * Asigna o actualiza el set de habilidades de un empleado.
   * Cumple con GPRCIMPER-89 y GPRCIMPER-90 (Actualización inmediata y auditoría).
   * * @param id ID del empleado
   * @param habilidadesIds Arreglo con los IDs de las nuevas habilidades
   * @param usuarioAuditoria Nombre o email del usuario que realiza el cambio (opcional)
   */
  async asignarHabilidades(id: number, habilidadesIds: number[], usuarioAuditoria?: string) {
    // 1. Asegurar que el empleado existe en la base de datos
    await this.findOne(id);

    // 2. Ejecutar la limpieza y reasignación en una transacción atómica
    return this.repo.prClient.$transaction(async (tx) => {
      
      // Eliminar todas las asignaciones previas de este empleado
      await tx.habilidadEmpleado.deleteMany({
        where: { empleadoId: id },
      });

      // Si el arreglo contiene elementos, insertamos las nuevas relaciones
      if (habilidadesIds && habilidadesIds.length > 0) {
        const nuevosRegistros = habilidadesIds.map((habilidadId) => ({
          empleadoId: id,
          habilidadId: habilidadId,
          assignedBy: usuarioAuditoria ?? 'Sistema_Mnt', // Criterio de aceptación: Registro de quién cambió
        }));

        await tx.habilidadEmpleado.createMany({
          data: nuevosRegistros,
        });
      }

      // 3. Retornar el empleado actualizado con sus nuevas habilidades inmediatamente
      return tx.empleado.findUnique({
        where: { id },
        include: {
          cargo: true,
          habilidades: {
            include: {
              habilidad: true,
            },
          },
        },
      });
    });
  }
  async updateHabilidades(id: number, habilidadesIds: number[]) {
    try {
      // 2. Añade explícitamente el tipo : Prisma.TransactionClient al parámetro tx
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        
        // 1. Limpiar las habilidades previas asignadas a este empleado
        await tx.habilidadEmpleado.deleteMany({
          where: { empleadoId: id },
        });

        // 2. Insertar las nuevas habilidades seleccionadas en el Front
        if (habilidadesIds && habilidadesIds.length > 0) {
          await tx.habilidadEmpleado.createMany({
            data: habilidadesIds.map((id) => ({
              empleadoId: id,
              habilidadId: id,
              assignedBy: 'System_User',
            })),
          });
        }

        // 3. Devolver el empleado fresco con sus habilidades mapeadas
        return await tx.empleado.findUnique({
          where: { id: id },
          include: {
            habilidades: {
              include: { habilidad: true },
            },
          },
        });
      });
    } catch (error) {
      console.error('Error Crítico de Transacción Prisma 7.8:', error);
      throw new InternalServerErrorException('No se pudieron actualizar las habilidades en la ficha del empleado.');
    }
  }
}
