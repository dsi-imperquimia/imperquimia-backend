-- CreateEnum
CREATE TYPE "EstadoVerificacionHerramienta" AS ENUM ('PENDIENTE', 'VERIFICADA', 'AUSENTE');

-- CreateTable
CREATE TABLE "inv_jornadas_herramientas" (
    "id" SERIAL NOT NULL,
    "clave_operacion" UUID NOT NULL,
    "proyecto_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "creado_por_id" INTEGER NOT NULL,
    "verificacion_inicio_at" TIMESTAMP(3),
    "verificacion_retorno_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_jornadas_herramientas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_jornada_herramientas_items" (
    "id" SERIAL NOT NULL,
    "jornada_id" INTEGER NOT NULL,
    "herramienta_id" INTEGER NOT NULL,
    "estado_inicio" "EstadoVerificacionHerramienta" NOT NULL DEFAULT 'PENDIENTE',
    "observacion_inicio" TEXT,
    "estado_retorno" "EstadoVerificacionHerramienta" NOT NULL DEFAULT 'PENDIENTE',
    "observacion_retorno" TEXT,
    "incidencia_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_jornada_herramientas_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inv_jornadas_herramientas_clave_operacion_key" ON "inv_jornadas_herramientas"("clave_operacion");

-- CreateIndex
CREATE INDEX "inv_jornadas_herramientas_empleado_id_fecha_idx" ON "inv_jornadas_herramientas"("empleado_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "inv_jornadas_herramientas_proyecto_id_empleado_id_fecha_key" ON "inv_jornadas_herramientas"("proyecto_id", "empleado_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "inv_jornada_herramientas_items_jornada_id_herramienta_id_key" ON "inv_jornada_herramientas_items"("jornada_id", "herramienta_id");

-- AddForeignKey
ALTER TABLE "inv_jornadas_herramientas" ADD CONSTRAINT "inv_jornadas_herramientas_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proy_proyectos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_jornadas_herramientas" ADD CONSTRAINT "inv_jornadas_herramientas_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "mnt_empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_jornadas_herramientas" ADD CONSTRAINT "inv_jornadas_herramientas_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_jornada_herramientas_items" ADD CONSTRAINT "inv_jornada_herramientas_items_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "inv_jornadas_herramientas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_jornada_herramientas_items" ADD CONSTRAINT "inv_jornada_herramientas_items_herramienta_id_fkey" FOREIGN KEY ("herramienta_id") REFERENCES "inv_herramientas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_jornada_herramientas_items" ADD CONSTRAINT "inv_jornada_herramientas_items_incidencia_id_fkey" FOREIGN KEY ("incidencia_id") REFERENCES "proy_incidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
