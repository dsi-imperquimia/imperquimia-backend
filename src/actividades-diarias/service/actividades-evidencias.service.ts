import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { ActividadesDiariasRepository } from '../repository/actividades-diarias.repository';
import { ActividadesDiariasService } from './actividades-diarias.service';

export const MAX_TAMANO_IMAGEN_BYTES = 10 * 1024 * 1024;
export const MAX_ARCHIVOS_POR_SUBIDA = 10;

export interface ArchivoImagenSubido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface FormatoImagenDetectado {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
}

export function detectarFormatoImagen(
  buffer: Buffer,
): FormatoImagenDetectado | null {
  if (buffer.length >= 3) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mimeType: 'image/jpeg', ext: 'jpg' };
    }
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', ext: 'png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', ext: 'webp' };
  }
  return null;
}

function sanitizarNombreArchivo(nombre?: string): string {
  const base = path
    .basename(nombre?.trim() || 'evidencia.jpg')
    .replace(/["\r\n]/g, '_');
  return (base || 'evidencia.jpg').slice(0, 255);
}

/** Gestiona validación, almacenamiento seguro y consulta de evidencias fotográficas. */
@Injectable()
export class ActividadesEvidenciasService {
  private readonly uploadsRoot: string;

  constructor(
    private readonly repo: ActividadesDiariasRepository,
    private readonly actividadesService: ActividadesDiariasService,
    uploadsDir?: string,
  ) {
    this.uploadsRoot = path.resolve(
      uploadsDir ?? path.join(process.cwd(), 'uploads', 'actividades-diarias'),
    );
  }

  async listar(actividadId: number, usuarioId: number) {
    await this.actividadesService.findOne(actividadId, usuarioId);
    return this.repo.findEvidenciasPorActividad(actividadId);
  }

  async adjuntar(
    actividadId: number,
    archivos: ArchivoImagenSubido[] | undefined,
    usuarioId: number,
  ) {
    const actividad = await this.actividadesService.findOne(
      actividadId,
      usuarioId,
    );
    if (actividad.proyecto.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se pueden adjuntar evidencias en proyectos activos.',
      );
    }

    if (!archivos || archivos.length === 0) {
      throw new BadRequestException(
        'Selecciona al menos una imagen para adjuntar.',
      );
    }
    if (archivos.length > MAX_ARCHIVOS_POR_SUBIDA) {
      throw new BadRequestException(
        `Puedes subir hasta ${MAX_ARCHIVOS_POR_SUBIDA} imágenes por lote.`,
      );
    }

    const preparados = archivos.map((archivo) => {
      if (!archivo?.buffer || archivo.buffer.length === 0) {
        throw new BadRequestException(
          'Uno de los archivos enviados está vacío.',
        );
      }
      if (archivo.buffer.length > MAX_TAMANO_IMAGEN_BYTES) {
        throw new BadRequestException(
          'Cada imagen debe pesar como máximo 10 MB.',
        );
      }
      const formato = detectarFormatoImagen(archivo.buffer);
      if (!formato) {
        throw new BadRequestException(
          'Formato no compatible. Solo se aceptan imágenes JPG, PNG o WEBP.',
        );
      }
      const nombreDisco = `${randomUUID()}.${formato.ext}`;
      return {
        buffer: archivo.buffer,
        nombreOriginal: sanitizarNombreArchivo(archivo.originalname),
        rutaArchivo: `${actividad.id}/${nombreDisco}`,
        mimeType: formato.mimeType,
        tamanoBytes: archivo.buffer.length,
        nombreDisco,
      };
    });

    const carpetaActividad = path.join(this.uploadsRoot, String(actividad.id));
    await mkdir(carpetaActividad, { recursive: true });

    const rutasEscritas: string[] = [];
    try {
      for (const item of preparados) {
        const rutaAbsoluta = path.join(carpetaActividad, item.nombreDisco);
        await writeFile(rutaAbsoluta, item.buffer);
        rutasEscritas.push(rutaAbsoluta);
      }

      return await this.repo.crearEvidencias(
        actividad.id,
        usuarioId,
        preparados.map(
          ({ nombreOriginal, rutaArchivo, mimeType, tamanoBytes }) => ({
            nombreOriginal,
            rutaArchivo,
            mimeType,
            tamanoBytes,
          }),
        ),
      );
    } catch (error) {
      await Promise.all(
        rutasEscritas.map((ruta) => unlink(ruta).catch(() => undefined)),
      );
      throw error;
    }
  }

  async obtenerArchivo(
    actividadId: number,
    evidenciaId: number,
    usuarioId: number,
  ) {
    await this.actividadesService.findOne(actividadId, usuarioId);
    const evidencia = await this.repo.findEvidenciaById(
      actividadId,
      evidenciaId,
    );
    if (!evidencia) {
      throw new NotFoundException('La evidencia solicitada no existe.');
    }

    const rutaAbsoluta = this.resolverRutaSegura(evidencia.rutaArchivo);
    try {
      await access(rutaAbsoluta);
    } catch {
      throw new NotFoundException(
        'El archivo de evidencia no se encuentra disponible.',
      );
    }

    return {
      stream: createReadStream(rutaAbsoluta),
      mimeType: evidencia.mimeType,
      nombreOriginal: sanitizarNombreArchivo(evidencia.nombreOriginal),
    };
  }

  async eliminar(actividadId: number, evidenciaId: number, usuarioId: number) {
    const actividad = await this.actividadesService.findOne(
      actividadId,
      usuarioId,
    );
    if (actividad.proyecto.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'Solo se pueden gestionar evidencias en proyectos activos.',
      );
    }

    const evidencia = await this.repo.findEvidenciaById(
      actividadId,
      evidenciaId,
    );
    if (!evidencia) {
      throw new NotFoundException('La evidencia solicitada no existe.');
    }

    await this.repo.eliminarEvidencia(evidencia.id);
    const rutaAbsoluta = this.resolverRutaSegura(evidencia.rutaArchivo);
    await unlink(rutaAbsoluta).catch(() => undefined);

    return { id: evidencia.id };
  }

  private resolverRutaSegura(rutaRelativa: string): string {
    const rutaAbsoluta = path.resolve(this.uploadsRoot, rutaRelativa);
    if (!rutaAbsoluta.startsWith(`${this.uploadsRoot}${path.sep}`)) {
      throw new ForbiddenException('Ruta de evidencia no permitida.');
    }
    return rutaAbsoluta;
  }
}
