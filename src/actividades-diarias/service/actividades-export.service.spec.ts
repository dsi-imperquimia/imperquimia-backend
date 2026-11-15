import ExcelJS from 'exceljs';
import { ActividadesExportService } from './actividades-export.service';

describe('ActividadesExportService (GPRIMPER-43)', () => {
  const service = new ActividadesExportService();

  const actividadesMuestra = [
    {
      id: 1,
      fecha: new Date('2026-11-10T00:00:00.000Z'),
      nombre: 'Impermeabilización de azotea',
      descripcion: 'Aplicación de membrana asfáltica en sector norte',
      observaciones: 'Clima despejado',
      proyecto: {
        id: 10,
        nombre: 'Torre Central',
      },
    },
    {
      id: 2,
      fecha: new Date('2026-11-12T00:00:00.000Z'),
      nombre: 'Sellado de juntas',
      descripcion: 'Sello elástico en losa de nivel 3',
      observaciones: null,
      proyecto: {
        id: 10,
        nombre: 'Torre Central',
      },
    },
  ];

  it('genera un archivo PDF válido con encabezado y actividades filtradas', async () => {
    const archivo = await service.exportar('pdf', actividadesMuestra, {
      proyectoNombre: 'Torre Central',
      fechaInicio: '2026-11-07',
      fechaFin: '2026-11-14',
    });

    expect(archivo.mimeType).toBe('application/pdf');
    expect(archivo.filename).toBe(
      'actividades-diarias-2026-11-07_a_2026-11-14.pdf',
    );
    expect(archivo.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(archivo.buffer.length).toBeGreaterThan(500);
  });

  it('genera un libro Excel (.xlsx) legible con las filas filtradas', async () => {
    const archivo = await service.exportar('excel', actividadesMuestra, {
      proyectoNombre: 'Torre Central',
      fechaInicio: '2026-11-07',
      fechaFin: '2026-11-14',
    });

    expect(archivo.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(archivo.filename).toBe(
      'actividades-diarias-2026-11-07_a_2026-11-14.xlsx',
    );
    expect(archivo.buffer.subarray(0, 2).toString('ascii')).toBe('PK');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(archivo.buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet('Actividades diarias');
    expect(sheet).toBeDefined();
    expect(sheet?.getCell('A1').value).toBe('Reporte de Actividades Diarias');
    expect(sheet?.getRow(4).values).toEqual([
      undefined,
      'Fecha',
      'Proyecto',
      'Actividad',
      'Descripción',
      'Observaciones',
    ]);
    expect(sheet?.getRow(5).getCell(1).value).toBe('10/11/2026');
    expect(sheet?.getRow(5).getCell(3).value).toBe(
      'Impermeabilización de azotea',
    );
    expect(sheet?.getRow(6).getCell(5).value).toBe('—');
  });

  it('genera reportes PDF y Excel válidos aun sin resultados en el rango', async () => {
    const pdf = await service.exportar('pdf', [], {
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-07',
    });
    const excel = await service.exportar('excel', [], {
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-07',
    });

    expect(pdf.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(excel.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  it('etiqueta los registros pendientes generados por el sistema al exportar a Excel y PDF', async () => {
    const pendientes = [
      {
        id: 77,
        fecha: new Date('2026-11-14T00:00:00.000Z'),
        nombre: 'Bitácora del día 2026-11-14',
        descripcion: '',
        observaciones: null,
        proyecto: { id: 10, nombre: 'Torre Central' },
      },
    ];
    const excel = await service.exportar('excel', pendientes, {});
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excel.buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet('Actividades diarias');
    expect(sheet?.getRow(5).getCell(4).value).toBe(
      'Pendiente de registrar (generada por el sistema)',
    );
  });
});
