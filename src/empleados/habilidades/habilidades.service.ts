import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHabilidadeDto } from './dto/create-habilidade.dto';
import { UpdateHabilidadeDto } from './dto/update-habilidade.dto';

@Injectable()
export class HabilidadesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createHabilidadeDto: CreateHabilidadeDto) {
    // 1. Limpiar espacios extra en los extremos del nombre
    const nombreLimpio = createHabilidadeDto.nombre.trim();

    // 2. Verificar si ya existe (Insensitive a mayúsculas/minúsculas)
    const habilidadExiste = await this.prisma.models.habilidad.findFirst({
      where: {
        nombre: {
          equals: nombreLimpio,
          mode: 'insensitive',
        },
      },
    });

    // 3. Si existe, lanzamos un error 409 (Conflict)
    if (habilidadExiste) {
      throw new ConflictException(`La habilidad "${nombreLimpio}" ya está registrada en el catálogo.,`);
    }

    // 4. Si no existe, se crea con éxito
    return await this.prisma.models.habilidad.create({
      data: {
        nombre: nombreLimpio,
        descripcion: createHabilidadeDto.descripcion ?? '',
      },
    });
  }
  async findAll() {
    try {
      return await this.prisma.models.habilidad.findMany({
        orderBy: {
          nombre: 'asc', // 🔤 Ordena alfabéticamente de la A a la Z
        },
      });
    } catch (error) {
      console.error(`Error al recuperar habilidades:`, error);
      // Manejo de errores interno por si falla la conexión a PostgreSQL
      throw new BadRequestException(`No se pudo recuperar el catálogo de habilidades.`,);
    }
    //return This action returns all habilidades;
  }

  findOne(id: number) {
    //return This action returns a #${id} habilidade;
  }

  async update(id: number, updateHabilidadeDto: UpdateHabilidadeDto) {
    // 1. Verificar primero si la habilidad a editar existe
    const habilidadExistente = await this.prisma.models.habilidad.findUnique({
      where: { id },
    });
    if (!habilidadExistente) {
      throw new NotFoundException(`La habilidad con ID ${id} no existe.`);
    }
    // 2. Si están intentando cambiar el nombre, validar duplicados
    if (updateHabilidadeDto.nombre) {
      const nombreLimpio = updateHabilidadeDto.nombre.trim();
      const duplicado = await this.prisma.models.habilidad.findFirst({
        where: {
          nombre: {
            equals: nombreLimpio,
            mode: 'insensitive',
          },
          id: { not: id }, // ⚠️ CLAVE: Que no sea la misma habilidad que estamos editando
        },
      });
      if (duplicado) {
        throw new ConflictException(`La habilidad "${nombreLimpio}" ya existe en el catálogo.,`);
      }
      updateHabilidadeDto.nombre = nombreLimpio; // Guardar el nombre sin espacios extra
    }
    // 2. Actualizar la habilidad en el catálogo
    return await this.prisma.models.habilidad.update({
      where: { id },
      data: updateHabilidadeDto,
    });
    //return This action updates a #${id} habilidade;
  }

  async remove(id: number) {
    // 1. Buscar si la habilidad está asignada a algún empleado que esté activo
    const asignadaAEmpleadoActivo =
      await this.prisma.models.habilidadEmpleado.findFirst({
        where: {
          habilidadId: id,
          empleado: { activo: true }, // El join con la tabla Empleado
        },
      });
    // 2. Si se encuentra un registro, lanzar excepción de BadRequest (error 400)
    if (asignadaAEmpleadoActivo) {
      throw new BadRequestException(`No se puede eliminar la habilidad porque está asignada a empleados activos.`,);
    }
    // 3. Si no está asignada a nadie activo, proceder con la eliminación física
    return this.prisma.models.habilidad.delete({
      where: { id },
    });
  }
}