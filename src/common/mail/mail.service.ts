import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface CorreoEnviar {
  to: string;
  subject: string;
  text: string;
}

// Envía correo por SMTP (Mailtrap u otro proveedor) usando las variables de
// entorno MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS y MAIL_FROM. Si no están
// configuradas, el envío se omite silenciosamente (no bloquea el flujo que lo
// dispara, ej. cancelar un proyecto o alertar un vencimiento).
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private configurado() {
    return Boolean(
      process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS,
    );
  }

  private getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT) || 587,
        auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      });
    }
    return this.transporter;
  }

  async enviar(correo: CorreoEnviar) {
    if (!this.configurado()) {
      this.logger.debug(
        `MAIL_HOST/MAIL_USER/MAIL_PASS no configurados; se omite el envío a ${correo.to}: ${correo.subject}`,
      );
      return;
    }
    try {
      await this.getTransporter().sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        ...correo,
      });
    } catch (error) {
      this.logger.error(`Error enviando correo a ${correo.to}`, error);
    }
  }
}
