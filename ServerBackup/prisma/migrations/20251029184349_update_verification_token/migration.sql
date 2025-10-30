-- DropIndex
DROP INDEX "usuario_verificationToken_key";

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "verification_token_expires_at" TIMESTAMP(3);
