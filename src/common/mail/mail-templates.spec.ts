import {
  correoAlertaHtml,
  correoCancelacionHtml,
  correoReasignacionHtml,
} from './mail-templates';

describe('correoReasignacionHtml', () => {
  it('incluye el nombre del empleado y ambos proyectos', () => {
    const html = correoReasignacionHtml({
      nombreEmpleado: 'Ana Gómez',
      nombreOrigen: 'Obra A',
      nombreDestino: 'Obra B',
    });
    expect(html).toContain('Ana Gómez');
    expect(html).toContain('Obra A');
    expect(html).toContain('Obra B');
    expect(html).toContain('<!doctype html>');
  });

  it('escapa caracteres HTML en los nombres para no romper la maquetación', () => {
    const html = correoReasignacionHtml({
      nombreEmpleado: '<script>alert(1)</script>',
      nombreOrigen: 'Obra & Cía',
      nombreDestino: 'Obra "B"',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Obra &amp; Cía');
    expect(html).toContain('Obra &quot;B&quot;');
  });
});

describe('correoCancelacionHtml', () => {
  it('incluye el nombre del proyecto y el motivo', () => {
    const html = correoCancelacionHtml({
      nombreProyecto: 'Obra A',
      motivo: 'El cliente desistió del proyecto.',
    });
    expect(html).toContain('Obra A');
    expect(html).toContain('El cliente desistió del proyecto.');
    expect(html).toContain('<!doctype html>');
  });

  it('escapa caracteres HTML en el motivo para no romper la maquetación', () => {
    const html = correoCancelacionHtml({
      nombreProyecto: 'Obra & Cía',
      motivo: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Obra &amp; Cía');
  });
});

describe('correoAlertaHtml', () => {
  it('usa la etiqueta "Vencido" cuando el proyecto ya venció', () => {
    const html = correoAlertaHtml({
      nombreConfiguracion: 'Proyecto vencido',
      nombreProyecto: 'Obra A',
      descripcion: 'El proyecto "Obra A" venció el 2026-01-01.',
      vencido: true,
    });
    expect(html).toContain('Vencido');
    expect(html).not.toContain('Próximo a vencer');
    expect(html).toContain('Obra A');
    expect(html).toContain('#b91c1c');
  });

  it('usa la etiqueta "Próximo a vencer" cuando todavía no vence', () => {
    const html = correoAlertaHtml({
      nombreConfiguracion: 'Proyecto próximo a vencer',
      nombreProyecto: 'Obra B',
      descripcion: 'El proyecto "Obra B" vence pronto.',
      vencido: false,
    });
    expect(html).toContain('Próximo a vencer');
    expect(html).toContain('#92400e');
  });

  it('escapa caracteres HTML en la descripción para no romper la maquetación', () => {
    const html = correoAlertaHtml({
      nombreConfiguracion: 'Proyecto vencido',
      nombreProyecto: 'Obra & Cía',
      descripcion: '<script>alert(1)</script>',
      vencido: true,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Obra &amp; Cía');
  });
});
