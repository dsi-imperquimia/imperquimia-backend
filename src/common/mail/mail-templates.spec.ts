import { correoReasignacionHtml } from './mail-templates';

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
