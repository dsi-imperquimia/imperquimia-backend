-- CreateEnum
CREATE TYPE "EstadoHerramienta" AS ENUM ('DISPONIBLE', 'EN_PROYECTO', 'MANTENIMIENTO', 'DANADA', 'DESECHO');

-- CreateEnum
CREATE TYPE "AreaMovimiento" AS ENUM ('BODEGA', 'PROYECTO', 'TALLER', 'DESECHO');

-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('ACTIVO', 'FINALIZADO', 'PAGADO', 'GARANTIA');

-- CreateTable
CREATE TABLE "inv_herramientas" (
    "id" SERIAL NOT NULL,
    "codigo_unico" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" "EstadoHerramienta" NOT NULL DEFAULT 'DISPONIBLE',
    "id_proyecto" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_herramientas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_movimientos_herramientas" (
    "id" SERIAL NOT NULL,
    "id_herramienta" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "origen" "AreaMovimiento" NOT NULL,
    "destino" "AreaMovimiento" NOT NULL,
    "id_proyecto_destino" INTEGER,
    "estado_herramienta" "EstadoHerramienta" NOT NULL,
    "fecha_movimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "inv_movimientos_herramientas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proy_proyectos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT,
    "estado" "EstadoProyecto" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "proy_proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inv_herramientas_codigo_unico_key" ON "inv_herramientas"("codigo_unico");

-- AddForeignKey
ALTER TABLE "inv_herramientas" ADD CONSTRAINT "inv_herramientas_id_proyecto_fkey" FOREIGN KEY ("id_proyecto") REFERENCES "proy_proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movimientos_herramientas" ADD CONSTRAINT "inv_movimientos_herramientas_id_herramienta_fkey" FOREIGN KEY ("id_herramienta") REFERENCES "inv_herramientas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movimientos_herramientas" ADD CONSTRAINT "inv_movimientos_herramientas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "mnt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movimientos_herramientas" ADD CONSTRAINT "inv_movimientos_herramientas_id_proyecto_destino_fkey" FOREIGN KEY ("id_proyecto_destino") REFERENCES "proy_proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
