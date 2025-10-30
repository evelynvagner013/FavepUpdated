-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "auth_code" TEXT,
ADD COLUMN     "auth_code_expires_at" TIMESTAMP(3);
