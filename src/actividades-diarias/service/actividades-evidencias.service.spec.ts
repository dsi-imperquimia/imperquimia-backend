import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { ActividadesDiariasModule } from '../actividades-diarias.module';
import {
  ActividadesEvidenciasService,
  type ArchivoImagenSubido,
  MAX_TAMANO_IMAGEN_BYTES,
  detectarFormatoImagen,
} from './actividades-evidencias.service';

const JPEG_VALIDO = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_VALIDO = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

function fileMock(originalname: string, buffer: Buffer): ArchivoImagenSubido {
  return {
    originalname,
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
  };
}

describe('ActividadesEvidenciasService (GPRIMPER-53)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'imperquimia-evidencias-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function setup(estadoProyecto = 'ACTIVO') {
    const repo = {
      findEvidenciasPorActividad: jest.fn(),
      findEvidenciaById: jest.fn(),
      crearEvidencias: jest.fn(),
      eliminarEvidencia: jest.fn(),
    };
    const actividadesService = {
      findOne: jest.fn().mockResolvedValue({
        id: 12,
        proyecto: {
          id: 10,
          nombre: 'Edificio Central',
          estado: estadoProyecto,
        },
      }),
    };
    const service = new ActividadesEvidenciasService(
      repo as any,
      actividadesService as any,
      tempDir,
    );
    return { repo, actividadesService, service };
  }

  it('detecta formatos JPG, PNG y WEBP por bytes reales y rechaza otros archivos', () => {
    expect(detectarFormatoImagen(JPEG_VALIDO)?.mimeType).toBe('image/jpeg');
    expect(detectarFormatoImagen(PNG_VALIDO)?.mimeType).toBe('image/png');
    expect(detectarFormatoImagen(Buffer.from('%PDF-1.7'))).toBeNull();
  });

  it('guarda una o varias imágenes válidas en disco y registra sus metadatos', async () => {
    const { repo, service } = setup();
    repo.crearEvidencias.mockImplementation(
      (
        _id: number,
        _userId: number,
        archivos: Array<Record<string, unknown>>,
      ) =>
        Promise.resolve(
          archivos.map((archivo, idx) => ({
            id: idx + 1,
            actividadDiariaId: 12,
            nombreOriginal: archivo.nombreOriginal,
            mimeType: archivo.mimeType,
            tamanoBytes: archivo.tamanoBytes,
            createdAt: new Date(),
          })),
        ),
    );

    const resultado = await service.adjuntar(
      12,
      [fileMock('foto1.jpg', JPEG_VALIDO), fileMock('foto2.png', PNG_VALIDO)],
      5,
    );

    expect(resultado).toHaveLength(2);
    expect(repo.crearEvidencias).toHaveBeenCalledWith(
      12,
      5,
      expect.arrayContaining([
        expect.objectContaining({
          nombreOriginal: 'foto1.jpg',
          mimeType: 'image/jpeg',
          tamanoBytes: JPEG_VALIDO.length,
        }),
        expect.objectContaining({
          nombreOriginal: 'foto2.png',
          mimeType: 'image/png',
          tamanoBytes: PNG_VALIDO.length,
        }),
      ]),
    );

    const llamadas = repo.crearEvidencias.mock.calls[0][2] as Array<{
      rutaArchivo: string;
    }>;
    for (const item of llamadas) {
      expect(existsSync(path.join(tempDir, item.rutaArchivo))).toBe(true);
    }
  });

  it('limpia los archivos escritos si falla la inserción en base de datos', async () => {
    const { repo, service } = setup();
    let rutasGuardadas: string[] = [];
    repo.crearEvidencias.mockImplementation(
      (
        _id: number,
        _userId: number,
        archivos: Array<{ rutaArchivo: string }>,
      ) => {
        rutasGuardadas = archivos.map((a) => path.join(tempDir, a.rutaArchivo));
        return Promise.reject(new Error('DB failure'));
      },
    );

    await expect(
      service.adjuntar(12, [fileMock('foto1.jpg', JPEG_VALIDO)], 5),
    ).rejects.toThrow('DB failure');

    expect(rutasGuardadas).toHaveLength(1);
    expect(existsSync(rutasGuardadas[0])).toBe(false);
  });

  it('rechaza listas vacías, formatos no válidos y archivos superiores a 10 MB', async () => {
    const { repo, service } = setup();

    await expect(service.adjuntar(12, [], 5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.adjuntar(12, [fileMock('doc.pdf', Buffer.from('%PDF-1.7'))], 5),
    ).rejects.toBeInstanceOf(BadRequestException);

    const demasiadoGrande = Buffer.alloc(MAX_TAMANO_IMAGEN_BYTES + 1);
    JPEG_VALIDO.copy(demasiadoGrande);
    await expect(
      service.adjuntar(12, [fileMock('enorme.jpg', demasiadoGrande)], 5),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repo.crearEvidencias).not.toHaveBeenCalled();
  });

  it('rechaza adjuntar o eliminar si el proyecto no está ACTIVO', async () => {
    const { service } = setup('FINALIZADO');
    await expect(
      service.adjuntar(12, [fileMock('foto.jpg', JPEG_VALIDO)], 5),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.eliminar(12, 1, 5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('permite consultar el stream del archivo y eliminar una evidencia existente', async () => {
    const { repo, service } = setup();
    let rutaRelativaGuardada = '';
    repo.crearEvidencias.mockImplementation(
      (
        _id: number,
        _userId: number,
        archivos: Array<{ rutaArchivo: string }>,
      ) => {
        rutaRelativaGuardada = archivos[0].rutaArchivo;
        return Promise.resolve([{ id: 77 }]);
      },
    );

    await service.adjuntar(12, [fileMock('obra.png', PNG_VALIDO)], 5);

    repo.findEvidenciaById.mockResolvedValue({
      id: 77,
      actividadDiariaId: 12,
      nombreOriginal: 'obra.png',
      rutaArchivo: rutaRelativaGuardada,
      mimeType: 'image/png',
      tamanoBytes: PNG_VALIDO.length,
    });

    const archivo = await service.obtenerArchivo(12, 77, 5);
    expect(archivo.mimeType).toBe('image/png');
    expect(archivo.nombreOriginal).toBe('obra.png');
    const chunks: Buffer[] = [];
    for await (const chunk of archivo.stream) {
      chunks.push(Buffer.from(chunk as Uint8Array));
    }
    expect(Buffer.concat(chunks)).toEqual(PNG_VALIDO);

    await service.eliminar(12, 77, 5);
    expect(repo.eliminarEvidencia).toHaveBeenCalledWith(77);
    expect(existsSync(path.join(tempDir, rutaRelativaGuardada))).toBe(false);

    repo.findEvidenciaById.mockResolvedValue(null);
    await expect(service.obtenerArchivo(12, 999, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resuelve todas las dependencias del módulo en el contenedor de NestJS', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ActividadesDiariasModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    const service = moduleRef.get(ActividadesEvidenciasService);
    expect(service).toBeInstanceOf(ActividadesEvidenciasService);
    await moduleRef.close();
  });

  it('genera Content-Disposition ASCII seguro con soporte UTF-8 para nombres con acentos o símbolos', async () => {
    const { repo, service } = setup();
    let rutaRelativaGuardada = '';
    repo.crearEvidencias.mockImplementation(
      (
        _id: number,
        _userId: number,
        archivos: Array<{ rutaArchivo: string }>,
      ) => {
        rutaRelativaGuardada = archivos[0].rutaArchivo;
        return Promise.resolve([{ id: 88 }]);
      },
    );

    const nombreUnicode = 'Foto losa — cámara 📷.jpg';
    await service.adjuntar(12, [fileMock(nombreUnicode, JPEG_VALIDO)], 5);

    repo.findEvidenciaById.mockResolvedValue({
      id: 88,
      actividadDiariaId: 12,
      nombreOriginal: nombreUnicode,
      rutaArchivo: rutaRelativaGuardada,
      mimeType: 'image/jpeg',
      tamanoBytes: JPEG_VALIDO.length,
    });

    const archivo = await service.obtenerArchivo(12, 88, 5);
    expect(archivo.nombreOriginal).toBe(nombreUnicode);
    expect(archivo.disposition).toMatch(/^[\x20-\x7e]+$/);
    expect(archivo.disposition).toContain(
      'filename="Foto losa _ camara _.jpg"',
    );
    expect(archivo.disposition).toContain("filename*=UTF-8''Foto%20losa%20");
    archivo.stream.destroy();
  });
});
