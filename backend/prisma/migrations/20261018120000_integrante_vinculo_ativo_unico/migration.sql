-- RN-FAM-006: um vinculo ATIVO por usuario/familia. A unique total impedia o
-- reingresso apos remocao logica; troca por indice unico parcial.

-- DropIndex
DROP INDEX "integrante_familia_familia_uid_usuario_uid_key";

-- CreateIndex
CREATE INDEX "integrante_familia_familia_uid_usuario_uid_situacao_idx" ON "integrante_familia"("familia_uid", "usuario_uid", "situacao");

-- CreateIndex
CREATE INDEX "integrante_familia_usuario_uid_situacao_idx" ON "integrante_familia"("usuario_uid", "situacao");

-- Indice unico parcial (nao expressavel no Prisma)
CREATE UNIQUE INDEX integrante_ativo_unico
  ON integrante_familia (familia_uid, usuario_uid) WHERE situacao = 'ATIVO';
