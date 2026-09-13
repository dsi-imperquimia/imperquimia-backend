import { PrismaService } from '@/prisma/prisma.service';
import { Empleado, Prisma } from '@gen/prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';

type DatosEmpleado = Pick<
  Empleado,
  'nombreCompleto' | 'dui' | 'nit' | 'cargoId' | 'activo'
>;

const empleadoInclude = {
  cargo: true,
  habilidades: { include: { habilidad: true } },
} satisfies Prisma.EmpleadoInclude;

// Repositorio para la tabla `empleados`
// Maneja todas las operaciones CRUD con la BD usando Prisma
@Injectable()
export class EmpleadoRepository {
  constructor(private readonly prisma: PrismaService) {}
  // Obtiene todos los empleados
  findMany() {
    return this.prisma.models.empleado.findMany({
      include: empleadoInclude,
    });
  }
  // Busca un empleado por id
  findUnique(id: number) {
    return this.prisma.models.empleado.findUnique({
      where: { id },
      include: empleadoInclude,
    });
  }
  // Crea un nuevo empleado
  create(data: DatosEmpleado, habilidadesIds: number[] = []) {
    return this.prisma.models.$transaction(async (tx) => {
      await this.validarHabilidades(tx, habilidadesIds);
      return tx.empleado.create({
        data: {
          ...data,
          ...(habilidadesIds.length > 0 && {
            habilidades: {
              createMany: {
                data: habilidadesIds.map((habilidadId) => ({ habilidadId })),
              },
            },
          }),
        },
        include: empleadoInclude,
      });
    });
  }
  // Actualiza un empleado por id
  update(id: number, data: Partial<DatosEmpleado>, habilidadesIds?: number[]) {
    return this.prisma.models.$transaction(async (tx) => {
      if (habilidadesIds !== undefined) {
        await this.validarHabilidades(tx, habilidadesIds);
      }

      return tx.empleado.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          ...(habilidadesIds !== undefined && {
            habilidades: {
              // Conservamos la auditoría de las asignaciones que no cambiaron.
              deleteMany: { habilidadId: { notIn: habilidadesIds } },
              ...(habilidadesIds.length > 0 && {
                createMany: {
                  data: habilidadesIds.map((habilidadId) => ({ habilidadId })),
                  skipDuplicates: true,
                },
              }),
            },
          }),
        },
        include: empleadoInclude,
      });
    });
  }

  private async validarHabilidades(
    tx: Pick<PrismaService['models'], 'habilidad'>,
    habilidadesIds: number[],
  ) {
    if (habilidadesIds.length === 0) return;
    const habilidades = await tx.habilidad.findMany({
      where: { id: { in: habilidadesIds } },
      select: { id: true },
    });
    const existentes = new Set(habilidades.map(({ id }) => id));
    const faltantes = habilidadesIds.filter((id) => !existentes.has(id));
    if (faltantes.length > 0) {
      throw new BadRequestException({
        message: {
          habilidadesIds: [
            `Las habilidades ${faltantes.join(', ')} ya no existen en el catálogo. Actualiza la lista e inténtalo de nuevo.`,
          ],
        },
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  }
  // Elimina un empleado por id
  delete(id: number) {
    return this.prisma.models.empleado.delete({ where: { id } });
  }
  // Exponemos el cliente de Prisma para manejar transacciones complejas en el Service
  get prClient() {
    return this.prisma;
  }
}
