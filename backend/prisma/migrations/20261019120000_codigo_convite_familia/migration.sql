-- CreateEnum
CREATE TYPE "SituacaoCodigoConvite" AS ENUM ('ATIVO', 'USADO', 'REVOGADO', 'EXPIRADO');

-- CreateTable
CREATE TABLE "codigo_convite_familia" (
    "uid" UUID NOT NULL,
    "familia_uid" UUID NOT NULL,
    "emitido_por_uid" UUID NOT NULL,
    "usado_por_uid" UUID,
    "papel_oferecido" "PapelFamilia" NOT NULL DEFAULT 'INTEGRANTE',
    "codigo_hash" VARCHAR(255) NOT NULL,
    "situacao" "SituacaoCodigoConvite" NOT NULL DEFAULT 'ATIVO',
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usado_em" TIMESTAMPTZ(3),

    CONSTRAINT "codigo_convite_familia_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "codigo_convite_familia_codigo_hash_key" ON "codigo_convite_familia"("codigo_hash");

-- CreateIndex
CREATE INDEX "codigo_convite_familia_familia_uid_situacao_expira_em_idx" ON "codigo_convite_familia"("familia_uid", "situacao", "expira_em");

-- AddForeignKey
ALTER TABLE "codigo_convite_familia" ADD CONSTRAINT "codigo_convite_familia_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigo_convite_familia" ADD CONSTRAINT "codigo_convite_familia_emitido_por_uid_fkey" FOREIGN KEY ("emitido_por_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigo_convite_familia" ADD CONSTRAINT "codigo_convite_familia_usado_por_uid_fkey" FOREIGN KEY ("usado_por_uid") REFERENCES "usuario"("uid") ON DELETE SET NULL ON UPDATE CASCADE;


-- Codigo de convite: nunca oferece o papel ADMINISTRADOR e guarda so o HMAC (hexadecimal) do codigo.
ALTER TABLE "codigo_convite_familia" ADD CONSTRAINT "codigo_convite_papel_sem_admin" CHECK ("papel_oferecido" <> 'ADMINISTRADOR');
ALTER TABLE "codigo_convite_familia" ADD CONSTRAINT "codigo_convite_hash_formato" CHECK ("codigo_hash" ~ '^[0-9a-f]{64}$');
