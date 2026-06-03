-- AlterTable
ALTER TABLE "mnt_users" ADD COLUMN     "role_id" INTEGER;

-- CreateTable
CREATE TABLE "mnt_roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mnt_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_group_roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mnt_group_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mnt_user_roles" (
    "user_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "mnt_user_roles_pkey" PRIMARY KEY ("user_id","permission_id")
);

-- CreateTable
CREATE TABLE "mnt_group_roles_roles" (
    "group_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "mnt_group_roles_roles_pkey" PRIMARY KEY ("group_id","permission_id")
);

-- AddForeignKey
ALTER TABLE "mnt_users" ADD CONSTRAINT "mnt_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "mnt_group_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_user_roles" ADD CONSTRAINT "mnt_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mnt_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_user_roles" ADD CONSTRAINT "mnt_user_roles_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "mnt_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_group_roles_roles" ADD CONSTRAINT "mnt_group_roles_roles_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "mnt_group_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_group_roles_roles" ADD CONSTRAINT "mnt_group_roles_roles_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "mnt_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
