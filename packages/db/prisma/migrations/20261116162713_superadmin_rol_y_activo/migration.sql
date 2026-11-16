-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;
