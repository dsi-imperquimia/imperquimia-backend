/*
  Warnings:

  - You are about to drop the `mnt_user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "mnt_user_roles" DROP CONSTRAINT "mnt_user_roles_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "mnt_user_roles" DROP CONSTRAINT "mnt_user_roles_user_id_fkey";

-- DropTable
DROP TABLE "mnt_user_roles";

-- CreateTable
CREATE TABLE "mnt_user_permissions" (
    "user_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "mnt_user_permissions_pkey" PRIMARY KEY ("user_id","permission_id")
);

-- AddForeignKey
ALTER TABLE "mnt_user_permissions" ADD CONSTRAINT "mnt_user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mnt_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mnt_user_permissions" ADD CONSTRAINT "mnt_user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "mnt_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
