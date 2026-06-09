-- CreateTable
CREATE TABLE "mnt_habilidades" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mnt_habilidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_habilidad_empleados" (
    "empleadoId" INTEGER NOT NULL,
    "habilidad_Id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "mnt_habilidad_empleados_pkey" PRIMARY KEY ("empleadoId","habilidad_Id")
);

-- AddForeignKey
ALTER TABLE "mnt_habilidad_empleados" ADD CONSTRAINT "mnt_habilidad_empleados_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "mnt_empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_habilidad_empleados" ADD CONSTRAINT "mnt_habilidad_empleados_habilidad_Id_fkey" FOREIGN KEY ("habilidad_Id") REFERENCES "mnt_habilidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
