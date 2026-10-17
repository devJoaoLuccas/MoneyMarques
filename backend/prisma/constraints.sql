-- Money Marques — constraints que o Prisma nao expressa (REFERENCIA CONSOLIDADA).
-- O que vale e o que esta nas migrations; novas constraints entram na migration que as introduz
-- e este arquivo e atualizado para refletir o estado final.

-- ─── Usuario / convites ────────────────────────────────────────────────────
-- E-mail protegido (migration 20261017120000_email_hmac): HMAC-SHA-256 em hexadecimal
ALTER TABLE usuario ADD CONSTRAINT usuario_email_hmac_formato CHECK (email_hmac ~ '^[0-9a-f]{64}$');
ALTER TABLE convite_familia ADD CONSTRAINT convite_email_hmac_formato CHECK (email_destino_hmac ~ '^[0-9a-f]{64}$');

-- Um unico convite pendente por familia + e-mail (pelo HMAC)
CREATE UNIQUE INDEX convite_pendente_unico
  ON convite_familia (familia_uid, email_destino_hmac) WHERE situacao = 'PENDENTE';

-- Um unico vinculo ATIVO por usuario/familia (migration 20261018120000; permite reingresso apos remocao)
CREATE UNIQUE INDEX integrante_ativo_unico
  ON integrante_familia (familia_uid, usuario_uid) WHERE situacao = 'ATIVO';

-- Codigo de convite (migration 20261019120000): nunca oferece ADMINISTRADOR; so o HMAC do codigo e guardado
ALTER TABLE codigo_convite_familia ADD CONSTRAINT codigo_convite_papel_sem_admin CHECK (papel_oferecido <> 'ADMINISTRADOR');
ALTER TABLE codigo_convite_familia ADD CONSTRAINT codigo_convite_hash_formato CHECK (codigo_hash ~ '^[0-9a-f]{64}$');

-- Exatamente um administrador ativo no minimo: validado em transacao no servico
-- (a regra "ultimo administrador" nao e expressavel como CHECK de linha).

-- ─── Visibilidade e escopo ─────────────────────────────────────────────────
ALTER TABLE conta_financeira ADD CONSTRAINT conta_visibilidade_familia
  CHECK (visibilidade = 'PRIVADO' OR familia_uid IS NOT NULL);
ALTER TABLE categoria_financeira ADD CONSTRAINT categoria_visibilidade_familia
  CHECK (visibilidade = 'PRIVADO' OR familia_uid IS NOT NULL);
ALTER TABLE cartao_credito ADD CONSTRAINT cartao_visibilidade_familia
  CHECK (visibilidade = 'PRIVADO' OR familia_uid IS NOT NULL);
ALTER TABLE posicao_investimento ADD CONSTRAINT posicao_visibilidade_familia
  CHECK (visibilidade = 'PRIVADO' OR familia_uid IS NOT NULL);
ALTER TABLE lancamento_financeiro ADD CONSTRAINT lancamento_visibilidade_familia
  CHECK (visibilidade = 'PRIVADO' OR familia_uid IS NOT NULL);
ALTER TABLE lancamento_financeiro ADD CONSTRAINT lancamento_escopo_familia
  CHECK (escopo_orcamento = 'PESSOAL' OR familia_uid IS NOT NULL);
ALTER TABLE recorrencia_financeira ADD CONSTRAINT recorrencia_visibilidade_familia
  CHECK (visibilidade = 'PRIVADO' OR familia_uid IS NOT NULL);
ALTER TABLE recorrencia_financeira ADD CONSTRAINT recorrencia_escopo_familia
  CHECK (escopo_orcamento = 'PESSOAL' OR familia_uid IS NOT NULL);
-- compra_cartao.escopo_orcamento FAMILIAR exige cartao com familia_uid: validado no servico (cruza tabelas).

ALTER TABLE orcamento_categoria ADD CONSTRAINT orcamento_escopo_consistente CHECK (
  (escopo = 'PESSOAL'  AND familia_uid IS NULL     AND escopo_uid = titular_uid) OR
  (escopo = 'FAMILIAR' AND familia_uid IS NOT NULL AND escopo_uid = familia_uid)
);

-- ─── Valores ───────────────────────────────────────────────────────────────
ALTER TABLE lancamento_financeiro ADD CONSTRAINT lancamento_valor_positivo CHECK (valor_centavos > 0);
ALTER TABLE recorrencia_financeira ADD CONSTRAINT recorrencia_valor_positivo CHECK (valor_centavos > 0);
ALTER TABLE recorrencia_financeira ADD CONSTRAINT recorrencia_periodo_valido CHECK (fim IS NULL OR fim >= inicio);
ALTER TABLE movimentacao_conta ADD CONSTRAINT movimentacao_valor_nao_zero CHECK (valor_centavos <> 0);
ALTER TABLE movimentacao_conta ADD CONSTRAINT movimentacao_estorno_tipo
  CHECK ((tipo = 'ESTORNO') = (estorno_de_uid IS NOT NULL));
ALTER TABLE liquidacao_lancamento ADD CONSTRAINT liquidacao_valor_positivo CHECK (valor_centavos > 0);
ALTER TABLE transferencia_financeira ADD CONSTRAINT transferencia_valor_positivo CHECK (valor_centavos > 0);
ALTER TABLE transferencia_financeira ADD CONSTRAINT transferencia_contas_distintas
  CHECK (conta_origem_uid <> conta_destino_uid);
ALTER TABLE pagamento_fatura ADD CONSTRAINT pagamento_valor_positivo CHECK (valor_centavos > 0);
ALTER TABLE ajuste_fatura ADD CONSTRAINT ajuste_valor_positivo CHECK (valor_centavos > 0);
ALTER TABLE orcamento_categoria ADD CONSTRAINT orcamento_limite_positivo CHECK (limite_centavos > 0);
ALTER TABLE movimento_investimento ADD CONSTRAINT movimento_inv_valor CHECK (
  (tipo IN ('APORTE', 'RESGATE') AND valor_centavos > 0) OR (tipo = 'AJUSTE' AND valor_centavos <> 0)
);
ALTER TABLE cartao_credito ADD CONSTRAINT cartao_limite_nao_negativo CHECK (limite_centavos >= 0);
ALTER TABLE conta_financeira ADD CONSTRAINT conta_moeda_brl CHECK (moeda = 'BRL'); -- MVP: somente BRL

-- ─── Cartoes ───────────────────────────────────────────────────────────────
ALTER TABLE cartao_credito ADD CONSTRAINT cartao_dia_fechamento CHECK (dia_fechamento BETWEEN 1 AND 31);
ALTER TABLE cartao_credito ADD CONSTRAINT cartao_dia_vencimento CHECK (dia_vencimento BETWEEN 1 AND 31);
ALTER TABLE compra_cartao ADD CONSTRAINT compra_valor_positivo CHECK (valor_total_centavos > 0);
ALTER TABLE compra_cartao ADD CONSTRAINT compra_parcelas_validas CHECK (quantidade_parcelas >= 1);
ALTER TABLE parcela_compra ADD CONSTRAINT parcela_valor_positivo CHECK (valor_centavos > 0);
ALTER TABLE parcela_compra ADD CONSTRAINT parcela_numero_positivo CHECK (numero >= 1);
-- Soma das parcelas = valor_total e numero <= quantidade_parcelas: validado na transacao de criacao da compra.

-- ─── Preferencias ──────────────────────────────────────────────────────────
ALTER TABLE preferencia_usuario ADD CONSTRAINT preferencia_horizonte
  CHECK (horizonte_meses BETWEEN 1 AND 24);

-- ─── Auditoria append-only ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auditoria_imutavel() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evento_auditoria e append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evento_auditoria_sem_alteracao
  BEFORE UPDATE OR DELETE ON evento_auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_imutavel();
