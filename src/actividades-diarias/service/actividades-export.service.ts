import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export type FormatoExportacionActividad = 'pdf' | 'excel';

export interface ActividadExportable {
  id: number;
  fecha: Date;
  nombre: string;
  descripcion: string;
  observaciones: string | null;
  proyecto: {
    id: number;
    nombre: string;
  };
}

export interface FiltrosExportacionActividades {
  proyectoNombre?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ArchivoExportado {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

interface ColumnaTabla {
  header: string;
  widthPdf: number;
  widthExcel: number;
  valor: (actividad: ActividadExportable) => string;
}

const COLUMNAS: readonly ColumnaTabla[] = [
  {
    header: 'Fecha',
    widthPdf: 70,
    widthExcel: 14,
    valor: (a) => formatearFechaUtc(a.fecha),
  },
  {
    header: 'Proyecto',
    widthPdf: 135,
    widthExcel: 26,
    valor: (a) => a.proyecto.nombre,
  },
  {
    header: 'Actividad',
    widthPdf: 135,
    widthExcel: 28,
    valor: (a) => a.nombre,
  },
  {
    header: 'Descripción',
    widthPdf: 220,
    widthExcel: 46,
    valor: (a) => a.descripcion,
  },
  {
    header: 'Observaciones',
    widthPdf: 160,
    widthExcel: 36,
    valor: (a) => (a.observaciones?.trim() ? a.observaciones.trim() : '—'),
  },
];

function formatearFechaUtc(fecha: Date): string {
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const anio = fecha.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
}

function formatearIsoLegible(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

function describirRangoFechas(fechaInicio?: string, fechaFin?: string): string {
  if (fechaInicio && fechaFin) {
    return `Del ${formatearIsoLegible(fechaInicio)} al ${formatearIsoLegible(fechaFin)}`;
  }
  if (fechaInicio) return `Desde ${formatearIsoLegible(fechaInicio)}`;
  if (fechaFin) return `Hasta ${formatearIsoLegible(fechaFin)}`;
  return 'Todas las fechas';
}

function construirNombreArchivo(
  formato: FormatoExportacionActividad,
  filtros: FiltrosExportacionActividades,
): string {
  const ext = formato === 'excel' ? 'xlsx' : 'pdf';
  let sufijo: string;
  if (filtros.fechaInicio && filtros.fechaFin) {
    sufijo = `${filtros.fechaInicio}_a_${filtros.fechaFin}`;
  } else if (filtros.fechaInicio) {
    sufijo = `desde_${filtros.fechaInicio}`;
  } else if (filtros.fechaFin) {
    sufijo = `hasta_${filtros.fechaFin}`;
  } else {
    sufijo = new Date().toISOString().slice(0, 10);
  }
  return `actividades-diarias-${sufijo}.${ext}`;
}

/** Genera archivos Excel (.xlsx) y PDF con las actividades filtradas para reporte. */
@Injectable()
export class ActividadesExportService {
  async exportar(
    formato: FormatoExportacionActividad,
    actividades: ActividadExportable[],
    filtros: FiltrosExportacionActividades = {},
  ): Promise<ArchivoExportado> {
    const filename = construirNombreArchivo(formato, filtros);
    if (formato === 'excel') {
      const buffer = await this.generarExcel(actividades, filtros);
      return {
        buffer,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename,
      };
    }

    const buffer = await this.generarPdf(actividades, filtros);
    return {
      buffer,
      mimeType: 'application/pdf',
      filename,
    };
  }

  private async generarExcel(
    actividades: ActividadExportable[],
    filtros: FiltrosExportacionActividades,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Imperquimia';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Actividades diarias');
    sheet.columns = COLUMNAS.map((col) => ({
      width: col.widthExcel,
    }));

    const lastColLetter = String.fromCharCode(64 + COLUMNAS.length);
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Reporte de Actividades Diarias';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 24;

    const proyectoTexto =
      filtros.proyectoNombre ?? 'Todos los proyectos activos asignados';
    const rangoTexto = describirRangoFechas(
      filtros.fechaInicio,
      filtros.fechaFin,
    );
    sheet.mergeCells(`A2:${lastColLetter}2`);
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Proyecto: ${proyectoTexto} | Rango: ${rangoTexto} | Registros: ${actividades.length}`;
    subtitleCell.font = { size: 10, color: { argb: 'FF475569' } };
    sheet.getRow(2).height = 18;

    const headerRow = sheet.getRow(4);
    headerRow.values = COLUMNAS.map((col) => col.header);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E293B' } },
        bottom: { style: 'thin', color: { argb: 'FF1E293B' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    });

    if (actividades.length === 0) {
      sheet.mergeCells(`A5:${lastColLetter}5`);
      const emptyCell = sheet.getCell('A5');
      emptyCell.value =
        'No se encontraron actividades registradas para los filtros seleccionados.';
      emptyCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(5).height = 24;
    } else {
      actividades.forEach((actividad, index) => {
        const row = sheet.addRow(COLUMNAS.map((col) => col.valor(actividad)));
        const esPar = index % 2 === 1;
        row.eachCell((cell) => {
          cell.font = { size: 10, color: { argb: 'FF0F172A' } };
          cell.alignment = { vertical: 'top', wrapText: true };
          if (esPar) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' },
            };
          }
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });
      });
    }

    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    sheet.autoFilter = {
      from: 'A4',
      to: `${lastColLetter}4`,
    };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private generarPdf(
    actividades: ActividadExportable[],
    filtros: FiltrosExportacionActividades,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margin: 36,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Uint8Array) => {
        chunks.push(Buffer.from(chunk));
      });
      doc.on('error', (error: Error) => {
        reject(error);
      });
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      const left = doc.page.margins.left;
      const totalWidth = COLUMNAS.reduce((sum, col) => sum + col.widthPdf, 0);
      const bottomLimit = doc.page.height - doc.page.margins.bottom - 20;

      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor('#0F172A')
        .text('Reporte de Actividades Diarias', left, doc.page.margins.top);

      const proyectoTexto =
        filtros.proyectoNombre ?? 'Todos los proyectos activos asignados';
      const rangoTexto = describirRangoFechas(
        filtros.fechaInicio,
        filtros.fechaFin,
      );
      const generadoEl = new Date().toLocaleString('es-SV', {
        timeZone: 'America/El_Salvador',
      });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#475569')
        .text(
          `Proyecto: ${proyectoTexto}   |   Rango: ${rangoTexto}   |   Registros: ${actividades.length}   |   Generado: ${generadoEl}`,
          left,
          doc.page.margins.top + 22,
          { width: totalWidth },
        );

      let y = doc.page.margins.top + 44;
      y = this.dibujarEncabezadoPdf(doc, left, y, totalWidth);

      if (actividades.length === 0) {
        doc
          .rect(left, y, totalWidth, 32)
          .fillAndStroke('#F8FAFC', '#E2E8F0')
          .font('Helvetica-Oblique')
          .fontSize(9.5)
          .fillColor('#64748B')
          .text(
            'No se encontraron actividades registradas para los filtros seleccionados.',
            left + 10,
            y + 10,
            { width: totalWidth - 20, align: 'center' },
          );
      } else {
        actividades.forEach((actividad, index) => {
          doc.font('Helvetica').fontSize(8.5);
          const valores = COLUMNAS.map((col) => col.valor(actividad));
          const alturas = valores.map((texto, colIndex) =>
            doc.heightOfString(texto, {
              width: COLUMNAS[colIndex].widthPdf - 10,
            }),
          );
          const rowHeight = Math.max(22, Math.max(...alturas) + 10);

          if (y + rowHeight > bottomLimit) {
            doc.addPage();
            y = this.dibujarEncabezadoPdf(
              doc,
              left,
              doc.page.margins.top,
              totalWidth,
            );
          }

          if (index % 2 === 1) {
            doc.rect(left, y, totalWidth, rowHeight).fill('#F8FAFC');
          }
          doc
            .rect(left, y, totalWidth, rowHeight)
            .strokeColor('#E2E8F0')
            .lineWidth(0.5)
            .stroke();

          let x = left;
          COLUMNAS.forEach((col, colIndex) => {
            doc
              .font('Helvetica')
              .fontSize(8.5)
              .fillColor('#0F172A')
              .text(valores[colIndex], x + 5, y + 5, {
                width: col.widthPdf - 10,
              });
            x += col.widthPdf;
          });

          y += rowHeight;
        });
      }

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#64748B')
          .text(
            `Página ${i + 1} de ${range.count}`,
            left,
            doc.page.height - doc.page.margins.bottom - 10,
            { width: totalWidth, align: 'right', lineBreak: false },
          );
      }

      doc.end();
    });
  }

  private dibujarEncabezadoPdf(
    doc: InstanceType<typeof PDFDocument>,
    left: number,
    y: number,
    totalWidth: number,
  ): number {
    const headerHeight = 22;
    doc.rect(left, y, totalWidth, headerHeight).fill('#1E293B');

    let x = left;
    COLUMNAS.forEach((col) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#FFFFFF')
        .text(col.header, x + 5, y + 6, { width: col.widthPdf - 10 });
      x += col.widthPdf;
    });

    return y + headerHeight;
  }
}
