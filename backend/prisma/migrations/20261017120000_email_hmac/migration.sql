-- E-mail protegido (RF-013): troca o e-mail em texto puro por HMAC-SHA-256 +
-- copia cifrada AES-256-GCM. Pre-lancamento: sem dados a migrar (tabelas vazias).

-- Constraints/indices que dependiam do e-mail em texto puro
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_email_minusculo;
ALTER TABLE convite_familia DROP CONSTRAINT IF EXISTS convite_email_minusculo;
DROP INDEX IF EXISTS convite_pendente_unico;

-- DropIndex
DROP INDEX "convite_familia_email_destino_situacao_idx";

-- DropIndex
DROP INDEX "usuario_email_key";

-- AlterTable
ALTER TABLE "convite_familia" DROP COLUMN "email_destino",
ADD COLUMN     "email_destino_criptografado" TEXT NOT NULL,
ADD COLUMN     "email_destino_hmac" CHAR(64) NOT NULL;

-- AlterTable
ALTER TABLE "usuario" DROP COLUMN "email",
ADD COLUMN     "email_criptografado" TEXT NOT NULL,
ADD COLUMN     "email_hmac" CHAR(64) NOT NULL;

-- CreateIndex
CREATE INDEX "convite_familia_email_destino_hmac_situacao_idx" ON "convite_familia"("email_destino_hmac", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_hmac_key" ON "usuario"("email_hmac");


-- Formato do HMAC (SHA-256 em hexadecimal minusculo)
ALTER TABLE usuario ADD CONSTRAINT usuario_email_hmac_formato CHECK (email_hmac ~ '^[0-9a-f]{64}$');
ALTER TABLE convite_familia ADD CONSTRAINT convite_email_hmac_formato CHECK (email_destino_hmac ~ '^[0-9a-f]{64}$');

-- Um unico convite pendente por familia + e-mail (agora pelo HMAC)
CREATE UNIQUE INDEX convite_pendente_unico
  ON convite_familia (familia_uid, email_destino_hmac) WHERE situacao = 'PENDENTE';
