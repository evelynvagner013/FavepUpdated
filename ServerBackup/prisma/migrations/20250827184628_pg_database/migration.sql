-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "fotoperfil" TEXT,
    "senha" TEXT NOT NULL,
    "emailVerified" BOOLEAN DEFAULT false,
    "verificationToken" TEXT,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propriedade" (
    "id" TEXT NOT NULL,
    "nomepropriedade" TEXT NOT NULL,
    "localizacao" TEXT,
    "usuarioId" TEXT NOT NULL,
    "area_ha" INTEGER,

    CONSTRAINT "propriedade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producao" (
    "id" SERIAL NOT NULL,
    "safra" TEXT NOT NULL,
    "areaproducao" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "cultura" TEXT NOT NULL,
    "produtividade" DOUBLE PRECISION NOT NULL,
    "propriedadeId" TEXT NOT NULL,

    CONSTRAINT "producao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "propriedadeId" TEXT NOT NULL,

    CONSTRAINT "financeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_mercado_pago" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "dataAssinatura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPagamento" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "idAssinaturaExterna" TEXT,

    CONSTRAINT "planos_mercado_pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_telefone_key" ON "usuario"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_verificationToken_key" ON "usuario"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_resetPasswordToken_key" ON "usuario"("resetPasswordToken");

-- CreateIndex
CREATE UNIQUE INDEX "planos_mercado_pago_idAssinaturaExterna_key" ON "planos_mercado_pago"("idAssinaturaExterna");

-- AddForeignKey
ALTER TABLE "propriedade" ADD CONSTRAINT "propriedade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producao" ADD CONSTRAINT "producao_propriedadeId_fkey" FOREIGN KEY ("propriedadeId") REFERENCES "propriedade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro" ADD CONSTRAINT "financeiro_propriedadeId_fkey" FOREIGN KEY ("propriedadeId") REFERENCES "propriedade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_mercado_pago" ADD CONSTRAINT "planos_mercado_pago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
