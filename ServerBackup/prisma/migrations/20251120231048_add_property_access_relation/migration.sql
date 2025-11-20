-- CreateTable
CREATE TABLE "_PermissaoAcesso" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PermissaoAcesso_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PermissaoAcesso_B_index" ON "_PermissaoAcesso"("B");

-- AddForeignKey
ALTER TABLE "_PermissaoAcesso" ADD CONSTRAINT "_PermissaoAcesso_A_fkey" FOREIGN KEY ("A") REFERENCES "propriedade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissaoAcesso" ADD CONSTRAINT "_PermissaoAcesso_B_fkey" FOREIGN KEY ("B") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
