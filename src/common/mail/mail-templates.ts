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
