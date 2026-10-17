-- AlterTable
ALTER TABLE "codigo_convite_familia" ADD COLUMN "codigo_criptografado" TEXT;

-- Um unico codigo ATIVO por familia (D-FAM-009); expirados sao marcados antes de gerar outro.
CREATE UNIQUE INDEX "codigo_convite_ativo_unico" ON "codigo_convite_familia" ("familia_uid") WHERE "situacao" = 'ATIVO';

-- A copia cifrada so existe enquanto o codigo esta ATIVO.
ALTER TABLE "codigo_convite_familia" ADD CONSTRAINT "codigo_convite_copia_so_ativo" CHECK ("codigo_criptografado" IS NULL OR "situacao" = 'ATIVO');
