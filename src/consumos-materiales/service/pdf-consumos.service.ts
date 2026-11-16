import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';

export type FilaReporteConsumo = {
  codigo: string;
  material: string;
  unidad: string;
  usado: string;
  merma: string;
  total: string;
};

export type DatosReporteConsumo = {
  proyecto: string;
  ubicacion: string;
  periodo: string;
  filas: FilaReporteConsumo[];
};

@Injectable()
export class PdfConsumosService {
  generar(data: DatosReporteConsumo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        bufferPages: true,
        margins: { top: 38, right: 56, bottom: 62, left: 56 },
        info: {
          Title: `Consumos de materiales - ${data.proyecto}`,
          Author: 'Imperquimia',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.encabezadoDocumento(doc, data);

      if (!data.filas.length) {
        doc.rect(56, doc.y, 500, 54).fillAndStroke('#F8F9FA', '#BBBBBB');
        doc
          .fillColor('#4B5563')
          .font('Helvetica')
          .fontSize(11)
          .text(
            'No hay consumos aplicados en el proyecto para el periodo seleccionado.',
            68,
            doc.y + 18,
            { width: 476 },
          );
        this.numerarPaginas(doc);
        doc.end();
        return;
      }

      this.encabezadoTabla(doc);
      for (const [index, fila] of data.filas.entries()) {
        const rowHeight = Math.max(
          29,
          doc.heightOfString(fila.material, { width: 178 }) + 14,
        );
        if (doc.y + rowHeight > 697) {
          doc.addPage();
          this.encabezadoContinuacion(doc, data.proyecto);
          this.encabezadoTabla(doc);
        }
        const y = doc.y;
        doc.rect(56, y, 500, rowHeight).fillAndStroke('#FFFFFF', '#BBBBBB');
        this.lineasColumnas(doc, y, rowHeight);
        doc.font('Helvetica').fontSize(8.5).fillColor('#333333');
        doc.text(String(index + 1), 61, y + 9, { width: 28, align: 'center' });
        doc.text(fila.material, 94, y + 9, { width: 178 });
        doc.text(fila.codigo, 277, y + 9, { width: 58, align: 'center' });
        doc.text(fila.usado, 340, y + 9, { width: 53, align: 'right' });
        doc.text(fila.merma, 398, y + 9, { width: 53, align: 'right' });
        doc.font('Helvetica-Bold');
        doc.text(fila.total, 456, y + 9, { width: 50, align: 'right' });
        doc.font('Helvetica');
        doc.text(fila.unidad, 511, y + 9, { width: 40, align: 'center' });
        doc.y = y + rowHeight;
      }

      if (doc.y + 52 > 697) doc.addPage();
      doc.moveDown(1.1);
      this.tituloSeccion(doc, 'NOTA');
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor('#555555')
        .text(
          'Este reporte incluye consumos aplicados y excluye registros corregidos. Los traslados y las devoluciones no se contabilizan como consumo.',
          56,
          doc.y,
          { width: 500, lineGap: 2 },
        );
      this.numerarPaginas(doc);
      doc.end();
    });
  }

  private encabezadoDocumento(
    doc: PDFKit.PDFDocument,
    data: DatosReporteConsumo,
  ) {
    this.logo(doc, 38, 92);
    doc.y = 145;
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor('#555555')
      .text(this.fechaLarga(new Date()), 56, doc.y, {
        width: 500,
        align: 'right',
      });
    doc.moveDown(1.3);
    doc.font('Helvetica').fontSize(10.5).fillColor('#333333').text('Señores');
    doc.font('Helvetica-Bold').text(data.proyecto);
    doc.moveDown(0.25);
    doc.font('Helvetica-Bold').text('PROYECTO:', { continued: true });
    doc.font('Helvetica').text(` ${data.proyecto}`);
    doc.font('Helvetica-Bold').text('UBICACIÓN:', { continued: true });
    doc
      .font('Helvetica')
      .text(` ${data.ubicacion || 'Sin ubicación registrada'}`);
    doc.font('Helvetica-Bold').text('PERIODO:', { continued: true });
    doc.font('Helvetica').text(` ${data.periodo}`);
    doc.moveDown(0.9);
    doc.text(
      'De acuerdo con el periodo seleccionado, se presenta el consumo de materiales registrado para el proyecto.',
      { width: 500, lineGap: 2 },
    );
    doc.moveDown(1.1);
    this.tituloSeccion(doc, 'MATERIALES CONSUMIDOS');
    doc.moveDown(0.65);
  }

  private encabezadoContinuacion(doc: PDFKit.PDFDocument, proyecto: string) {
    this.logo(doc, 34, 56, 210);
    doc.y = 102;
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor('#333333')
      .text('MATERIALES CONSUMIDOS — CONTINUACIÓN', 56, doc.y, {
        width: 500,
      });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#666666')
      .text(proyecto, 56, doc.y + 2, { width: 500 });
    doc.moveDown(0.7);
  }

  private logo(
    doc: PDFKit.PDFDocument,
    y: number,
    height: number,
    width = 300,
  ) {
    const logo = this.rutaLogo();
    if (logo) {
      doc.image(logo, (612 - width) / 2, y, {
        fit: [width, height],
        align: 'center',
        valign: 'center',
      });
      return;
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(25)
      .fillColor('#222222')
      .text('IMPERQUIMIA', 56, y + 24, { width: 500, align: 'center' });
  }

  private rutaLogo() {
    const rutas = [
      join(process.cwd(), 'src', 'assets', 'iq_isologo_1.png'),
      join(process.cwd(), 'dist', 'src', 'assets', 'iq_isologo_1.png'),
      join(__dirname, '..', '..', 'assets', 'iq_isologo_1.png'),
    ];
    return rutas.find((ruta) => existsSync(ruta));
  }

  private fechaLarga(fecha: Date) {
    const meses = [
      'ENERO',
      'FEBRERO',
      'MARZO',
      'ABRIL',
      'MAYO',
      'JUNIO',
      'JULIO',
      'AGOSTO',
      'SEPTIEMBRE',
      'OCTUBRE',
      'NOVIEMBRE',
      'DICIEMBRE',
    ];
    const partes = new Intl.DateTimeFormat('es-SV', {
      timeZone: 'America/El_Salvador',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(fecha);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
      Number(partes.find((parte) => parte.type === tipo)?.value);
    const dia = valor('day');
    const mes = valor('month');
    const anio = valor('year');
    return `San Salvador, ${dia} de ${meses[mes - 1]} de ${anio}`;
  }

  private tituloSeccion(doc: PDFKit.PDFDocument, titulo: string) {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#111111')
      .text(titulo, 56, doc.y, { width: 500 });
    const y = doc.y + 3;
    doc
      .moveTo(56, y)
      .lineTo(556, y)
      .lineWidth(0.7)
      .strokeColor('#DDDDDD')
      .stroke();
    doc.y = y + 5;
  }

  private encabezadoTabla(doc: PDFKit.PDFDocument) {
    const y = doc.y;
    doc.rect(56, y, 500, 30).fillAndStroke('#F8F9FA', '#BBBBBB');
    this.lineasColumnas(doc, y, 30);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111111');
    doc.text('Item', 61, y + 11, { width: 28, align: 'center' });
    doc.text('DESCRIPCIÓN', 94, y + 11, { width: 178, align: 'center' });
    doc.text('Código', 277, y + 11, { width: 58, align: 'center' });
    doc.text('Usado', 340, y + 11, { width: 53, align: 'center' });
    doc.text('Merma', 398, y + 11, { width: 53, align: 'center' });
    doc.text('Total', 456, y + 11, { width: 50, align: 'center' });
    doc.text('Unid', 511, y + 11, { width: 40, align: 'center' });
    doc.y = y + 30;
  }

  private lineasColumnas(doc: PDFKit.PDFDocument, y: number, alto: number) {
    doc.save();
    doc.lineWidth(0.5).strokeColor('#BBBBBB');
    for (const x of [89, 272, 335, 393, 451, 506]) {
      doc.moveTo(x, y).lineTo(x, y + alto);
    }
    doc.stroke();
    doc.restore();
  }

  private numerarPaginas(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(range.start + index);
      const margenInferior = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .moveTo(56, 724)
        .lineTo(556, 724)
        .lineWidth(0.5)
        .strokeColor('#EEEEEE')
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#666666')
        .text(
          'Av. Mejía Lara #11-76; Col. Campestre, San Salvador, El Salvador',
          56,
          733,
          { width: 500, align: 'center', lineBreak: false },
        )
        .text(
          'Telefax: 2263-8859, 2264-5417 | e-mail: gimperquimia@gmail.com',
          56,
          745,
          { width: 500, align: 'center', lineBreak: false },
        )
        .text(`Página ${index + 1} de ${range.count}`, 56, 760, {
          width: 500,
          align: 'right',
          lineBreak: false,
        });
      doc.page.margins.bottom = margenInferior;
    }
  }
}
