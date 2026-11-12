import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '@/common/mail/mail.service';
import { ProyectoRepository } from '../repository/proyectoRepository';
import { calcularAlertaVencimiento } from '../utils/alerta-vencimiento';

// Revisa diariamente los proyectos activos y notifica (sistema + correo) si
// están a punto de vencer o ya vencieron (GPRCIMPER-26). También se puede
// disparar manualmente vía POST /proyectos/revisar-vencimientos (demo/pruebas).
@Injectable()
export class ProyectoAlertasService {
  private readonly logger = new Logger(ProyectoAlertasService.name);

  constructor(
    private readonly repo: ProyectoRepository,
    private readonly mail: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async revisarVencimientos() {
    const candidatos = await this.repo.findCandidatosAlertaVencimiento();
    if (candidatos.length === 0) return { revisados: 0, notificados: 0 };

    const admins = await this.repo.findCorreosAdministradores();
    const correos = admins.map((admin) => admin.email);

    let notificados = 0;
    for (const proyecto of candidatos) {
      const alerta = calcularAlertaVencimiento('ACTIVO', proyecto.fechaFin);
      if (alerta === 'PROXIMO' && !proyecto.alertaProximaEnviada) {
        await this.notificar(proyecto.nombre, proyecto.fechaFin!, alerta, correos);
        await this.repo.marcarAlertaProximaEnviada(proyecto.id);
        notificados++;
      } else if (alerta === 'VENCIDO' && !proyecto.alertaVencidaEnviada) {
        await this.notificar(proyecto.nombre, proyecto.fechaFin!, alerta, correos);
        await this.repo.marcarAlertaVencidaEnviada(proyecto.id);
        notificados++;
      }
    }

    this.logger.log(
      `Revisión de vencimientos: ${candidatos.length} proyecto(s) evaluado(s), ${notificados} notificado(s).`,
    );
    return { revisados: candidatos.length, notificados };
  }

  private async notificar(
    nombreProyecto: string,
    fechaFin: Date,
    tipo: 'PROXIMO' | 'VENCIDO',
    correos: string[],
  ) {
    const fecha = fechaFin.toISOString().slice(0, 10);
    const subject =
      tipo === 'VENCIDO'
        ? `Proyecto vencido: ${nombreProyecto}`
        : `Proyecto próximo a vencer: ${nombreProyecto}`;
    const text =
      tipo === 'VENCIDO'
        ? `El proyecto "${nombreProyecto}" venció el ${fecha} y sigue activo.`
        : `El proyecto "${nombreProyecto}" vence el ${fecha} (7 días o menos).`;
    await Promise.all(
      correos.map((to) => this.mail.enviar({ to, subject, text })),
    );
  }
}
