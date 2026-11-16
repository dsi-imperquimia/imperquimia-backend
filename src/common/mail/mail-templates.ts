// Plantillas HTML para los correos de MailService. Todo el CSS va inline
// y la maquetación usa tablas a propósito: es lo único que los clientes de
// correo (Outlook, Gmail, etc.) soportan de forma consistente.

function escapeHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Envoltorio con el encabezado, pie y tarjeta blanca que comparten todos
// los correos de la app. `contenidoHtml` ya debe venir escapado/armado.
function layout(titulo: string, contenidoHtml: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#111827;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">Imperquimia</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(titulo)}</h1>
                ${contenidoHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">Este es un correo automático de Imperquimia. No respondas a este mensaje.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function filaDato(etiqueta: string, valor: string): string {
  return `<tr>
    <td style="padding:16px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(etiqueta)}</p>
      <p style="margin:4px 0 0;font-size:15px;color:#111827;font-weight:600;">${escapeHtml(valor)}</p>
    </td>
  </tr>`;
}

function etiquetaEstado(
  texto: string,
  colorFondo: string,
  colorTexto: string,
): string {
  return `<span style="display:inline-block;padding:4px 10px;border-radius:9999px;font-size:12px;font-weight:600;background-color:${colorFondo};color:${colorTexto};">${escapeHtml(texto)}</span>`;
}

// Correo al jefe de proyecto cuando pierde un técnico por reasignación
// (GPRCIMPER-84).
export function correoReasignacionHtml(data: {
  nombreEmpleado: string;
  nombreOrigen: string;
  nombreDestino: string;
}): string {
  const contenido = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151;">
      <strong>${escapeHtml(data.nombreEmpleado)}</strong> fue reasignado a otro proyecto y ya no forma parte del equipo de esta obra.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
      ${filaDato('Proyecto de origen', data.nombreOrigen)}
      <tr><td style="border-top:1px solid #e5e7eb;"></td></tr>
      ${filaDato('Proyecto de destino', data.nombreDestino)}
    </table>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
      Si necesitas cubrir esta posición, puedes asignar otro técnico desde el sistema.
    </p>`;
  return layout('Técnico reasignado', contenido);
}

// Correo a los empleados asignados cuando se cancela el proyecto
// (GPRCIMPER-28).
export function correoCancelacionHtml(data: {
  nombreProyecto: string;
  motivo: string;
}): string {
  const contenido = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151;">
      El proyecto <strong>${escapeHtml(data.nombreProyecto)}</strong> fue cancelado.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;background-color:#fef2f2;border-radius:8px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0;font-size:12px;color:#b91c1c;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Motivo</p>
          <p style="margin:4px 0 0;font-size:15px;color:#7f1d1d;line-height:1.5;">${escapeHtml(data.motivo)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
      Si tenías actividades o materiales planificados en este proyecto, confírmalo con tu jefe de proyecto.
    </p>`;
  return layout('Proyecto cancelado', contenido);
}

// Correo de alertas automáticas de proyecto (vencimiento, próximo a vencer,
// etc. — GPRCIMPER-26). `vencido` colorea la etiqueta de rojo (ya venció) o
// ámbar (próximo a vencer).
export function correoAlertaHtml(data: {
  nombreConfiguracion: string;
  nombreProyecto: string;
  descripcion: string;
  vencido: boolean;
}): string {
  const colorFondo = data.vencido ? '#fef2f2' : '#fffbeb';
  const colorTexto = data.vencido ? '#b91c1c' : '#92400e';
  const etiqueta = data.vencido ? 'Vencido' : 'Próximo a vencer';
  const contenido = `
    <div style="margin:0 0 16px;">${etiquetaEstado(etiqueta, colorFondo, colorTexto)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Proyecto</p>
          <p style="margin:4px 0 12px;font-size:15px;color:#111827;font-weight:600;">${escapeHtml(data.nombreProyecto)}</p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">${escapeHtml(data.descripcion)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
      Revisa el proyecto en el sistema para tomar acción.
    </p>`;
  return layout(data.nombreConfiguracion, contenido);
}
