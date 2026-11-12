-- AlterTable
ALTER TABLE "mnt_users" ADD COLUMN     "empleado_id" INTEGER;

-- AlterTable
ALTER TABLE "proy_proyectos" ADD COLUMN     "jefe_proyecto_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "mnt_users_empleado_id_key" ON "mnt_users"("empleado_id");

-- AddForeignKey
ALTER TABLE "mnt_users" ADD CONSTRAINT "mnt_users_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "mnt_empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proy_proyectos" ADD CONSTRAINT "proy_proyectos_jefe_proyecto_id_fkey" FOREIGN KEY ("jefe_proyecto_id") REFERENCES "mnt_empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
