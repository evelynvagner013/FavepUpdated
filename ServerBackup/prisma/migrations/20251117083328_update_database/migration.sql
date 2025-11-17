-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('ADMINISTRADOR', 'GERENTE', 'FUNCIONARIO');

-- DropIndex
DROP INDEX "usuario_telefone_key";

-- AlterTable
ALTER TABLE "producao" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ativo';

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "cargo" "Cargo" NOT NULL DEFAULT 'ADMINISTRADOR',
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
