import { ConsumosMaterialesService } from '@/consumos-materiales/service/consumos-materiales.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@gen/prisma/client';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

const INTERVALO_MS = 60_000;
// -1 y -2 ya identifican las alertas automáticas de vencimiento.
const reglaDesviacion = (id: number) => -2 - id;

@Injectable()
export class AlertasDesviacionesService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AlertasDesviacionesService.name);
  private timer?: NodeJS.Timeout;
  private generacion?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly consumos: ConsumosMaterialesService,
  ) {}

  onModuleInit() {
    this.programarGeneracion();
    this.timer = setInterval(() => this.programarGeneracion(), INTERVALO_MS);
    this.timer.unref();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.generacion;
  }

  private programarGeneracion() {
    if (this.generacion) return;
    const generacion = this.generarAutomaticamente().catch((error: unknown) => {
      this.logger.error(
        'No se pudieron generar las alertas de desviaciones.',
        error,
      );
    });
    this.generacion = generacion;
    void generacion.finally(() => {
      if (this.generacion === generacion) this.generacion = undefined;
    });
  }

  async generarAutomaticamente(now = new Date()) {
    const [proyectos, administradores] = await Promise.all([
      this.prisma.proyecto.findMany({
        where: { deletedAt: null, consumosMaterial: { some: {} } },
        select: {
          id: true,
          nombre: true,
          jefeProyecto: {
            select: {
              activo: true,
              deletedAt: true,
              user: { select: { id: true, deletedAt: true } },
            },
          },
          empleados: {
            where: {
              fechaRetiro: null,
              empleado: { activo: true, deletedAt: null },
            },
            select: {
              empleado: {
                select: {
                  user: {
                    select: {
                      id: true,
                      deletedAt: true,
                      role: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null, role: { name: 'Administrador' } },
        select: { id: true },
      }),
    ]);

    for (const proyecto of proyectos) {
      try {
        const desviaciones =
          await this.consumos.sincronizarDesviacionesProyecto(proyecto.id);
        if (!desviaciones.length) continue;

        const destinatarios = new Set(administradores.map(({ id }) => id));
        const jefe = proyecto.jefeProyecto;
        if (
          jefe?.activo &&
          !jefe.deletedAt &&
          jefe.user &&
          !jefe.user.deletedAt
        ) {
          destinatarios.add(jefe.user.id);
        }
        for (const asignacion of proyecto.empleados) {
          const user = asignacion.empleado.user;
          if (user && !user.deletedAt && user.role?.name === 'Técnico') {
            destinatarios.add(user.id);
          }
        }

        for (const desviacion of desviaciones) {
          const reglaId = reglaDesviacion(desviacion.id);
          if (reglaId < -2_147_483_648) {
            throw new Error(
              `ID de desviación fuera de rango: ${desviacion.id}`,
            );
          }
          const descripcion =
            `El consumo acumulado de ${desviacion.material.nombre} ` +
            `(${desviacion.valorObservado.toString()} ${desviacion.material.unidad}) ` +
            `superó lo presupuestado (${desviacion.valorReferencia.toString()} ${desviacion.material.unidad}).`;
          const fechaDesviacion = new Date(
            desviacion.createdAt.toISOString().slice(0, 10) + 'T00:00:00.000Z',
          );

          for (const destinatarioId of destinatarios) {
            const existente = await this.prisma.notificacionAlerta.findFirst({
              where: { reglaId, proyectoId: proyecto.id, destinatarioId },
              select: { id: true },
            });
            if (existente) continue;
            try {
              await this.prisma.notificacionAlerta.create({
                data: {
                  reglaId,
                  configuracionId: null,
                  proyectoId: proyecto.id,
                  destinatarioId,
                  creadaPorId: null,
                  nombreConfiguracion: 'Desviación de consumo',
                  nombreProyecto: proyecto.nombre,
                  descripcion,
                  primeraGeneracion: now,
                  ultimaGeneracion: now,
                  ultimaFechaProgramada: fechaDesviacion,
                },
              });
            } catch (error) {
              if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
              ) {
                continue;
              }
              throw error;
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `No se pudieron generar las alertas de desviación del proyecto ${proyecto.id}.`,
          error,
        );
      }
    }
  }
}
