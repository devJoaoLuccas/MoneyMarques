-- CreateEnum
CREATE TYPE "PapelFamilia" AS ENUM ('ADMINISTRADOR', 'INTEGRANTE', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "SituacaoIntegrante" AS ENUM ('ATIVO', 'SUSPENSO', 'REMOVIDO');

-- CreateEnum
CREATE TYPE "SituacaoConvite" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO', 'EXPIRADO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "VisibilidadeRecurso" AS ENUM ('PRIVADO', 'COMPARTILHADO', 'RESTRITO');

-- CreateEnum
CREATE TYPE "TipoRecursoFinanceiro" AS ENUM ('CONTA', 'CARTAO', 'ORCAMENTO', 'POSICAO_INVESTIMENTO', 'RELATORIO_CONSOLIDADO');

-- CreateEnum
CREATE TYPE "TipoTokenAutenticacao" AS ENUM ('VERIFICACAO_EMAIL', 'REDEFINICAO_SENHA');

-- CreateEnum
CREATE TYPE "ResultadoAuditoria" AS ENUM ('SUCESSO', 'FALHA', 'NEGADO');

-- CreateEnum
CREATE TYPE "TipoContaFinanceira" AS ENUM ('CORRENTE', 'POUPANCA', 'CARTEIRA', 'DINHEIRO', 'OUTRA');

-- CreateEnum
CREATE TYPE "SituacaoConta" AS ENUM ('ATIVA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "SituacaoLancamento" AS ENUM ('PREVISTO', 'PENDENTE', 'PARCIALMENTE_LIQUIDADO', 'LIQUIDADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SituacaoLiquidacao" AS ENUM ('CONFIRMADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoConta" AS ENUM ('RECEBIMENTO', 'PAGAMENTO', 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SAIDA', 'PAGAMENTO_FATURA', 'APORTE_INVESTIMENTO', 'RESGATE_INVESTIMENTO', 'AJUSTE', 'ESTORNO');

-- CreateEnum
CREATE TYPE "PeriodicidadeRecorrencia" AS ENUM ('DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "SituacaoTransferencia" AS ENUM ('EFETIVADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "SituacaoCartao" AS ENUM ('ATIVO', 'BLOQUEADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "SituacaoCompraCartao" AS ENUM ('ATIVA', 'CANCELADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "SituacaoFatura" AS ENUM ('ABERTA', 'FECHADA', 'PARCIALMENTE_PAGA', 'PAGA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SituacaoPagamentoFatura" AS ENUM ('CONFIRMADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "TipoAjusteFatura" AS ENUM ('CREDITO', 'DEBITO', 'ESTORNO');

-- CreateEnum
CREATE TYPE "EscopoOrcamento" AS ENUM ('PESSOAL', 'FAMILIAR');

-- CreateEnum
CREATE TYPE "SituacaoOrcamento" AS ENUM ('ATIVO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "SituacaoPosicaoInvestimento" AS ENUM ('ATIVA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "TipoMovimentoInvestimento" AS ENUM ('APORTE', 'RESGATE', 'AJUSTE');

-- CreateEnum
CREATE TYPE "SituacaoMovimentoInvestimento" AS ENUM ('CONFIRMADO', 'ESTORNADO');

-- CreateEnum
CREATE TYPE "GravidadeAlerta" AS ENUM ('INFORMATIVO', 'ATENCAO', 'CRITICO');

-- CreateEnum
CREATE TYPE "SituacaoAlerta" AS ENUM ('ATIVO', 'LIDO', 'RESOLVIDO', 'DISPENSADO');

-- CreateTable
CREATE TABLE "usuario" (
    "uid" UUID NOT NULL,
    "nome_completo" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "email_verificado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "sessao_usuario" (
    "uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "mfa_verificado" BOOLEAN NOT NULL DEFAULT false,
    "manter_sessao" BOOLEAN NOT NULL DEFAULT false,
    "ip_criacao" VARCHAR(45),
    "user_agent" VARCHAR(1024),
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_atividade_em" TIMESTAMPTZ(3),
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "revogada_em" TIMESTAMPTZ(3),

    CONSTRAINT "sessao_usuario_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "token_autenticacao" (
    "uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "tipo" "TipoTokenAutenticacao" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "utilizado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_autenticacao_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "configuracao_mfa" (
    "uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "segredo_criptografado" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_passo_totp" BIGINT,
    "habilitado_em" TIMESTAMPTZ(3),
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "configuracao_mfa_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "codigo_recuperacao_mfa" (
    "uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "codigo_hash" VARCHAR(255) NOT NULL,
    "utilizado_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigo_recuperacao_mfa_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "familia" (
    "uid" UUID NOT NULL,
    "criador_uid" UUID NOT NULL,
    "nome" VARCHAR(40) NOT NULL,
    "descricao" VARCHAR(240),
    "avatar_url" TEXT,
    "configuracoes" JSONB,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,
    "encerrada_em" TIMESTAMPTZ(3),

    CONSTRAINT "familia_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "integrante_familia" (
    "uid" UUID NOT NULL,
    "familia_uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "papel" "PapelFamilia" NOT NULL DEFAULT 'INTEGRANTE',
    "situacao" "SituacaoIntegrante" NOT NULL DEFAULT 'ATIVO',
    "ingressou_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removido_em" TIMESTAMPTZ(3),

    CONSTRAINT "integrante_familia_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "convite_familia" (
    "uid" UUID NOT NULL,
    "familia_uid" UUID NOT NULL,
    "emitido_por_uid" UUID NOT NULL,
    "aceito_por_uid" UUID,
    "email_destino" VARCHAR(254) NOT NULL,
    "papel_oferecido" "PapelFamilia" NOT NULL DEFAULT 'INTEGRANTE',
    "token_hash" VARCHAR(255) NOT NULL,
    "situacao" "SituacaoConvite" NOT NULL DEFAULT 'PENDENTE',
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondido_em" TIMESTAMPTZ(3),

    CONSTRAINT "convite_familia_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "permissao_recurso_familia" (
    "uid" UUID NOT NULL,
    "familia_uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "concedido_por_uid" UUID NOT NULL,
    "tipo_recurso" "TipoRecursoFinanceiro" NOT NULL,
    "recurso_uid" UUID NOT NULL,
    "pode_visualizar" BOOLEAN NOT NULL DEFAULT true,
    "pode_criar" BOOLEAN NOT NULL DEFAULT false,
    "pode_editar" BOOLEAN NOT NULL DEFAULT false,
    "pode_excluir" BOOLEAN NOT NULL DEFAULT false,
    "concedida_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogada_em" TIMESTAMPTZ(3),

    CONSTRAINT "permissao_recurso_familia_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "instituicao_financeira" (
    "uid" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instituicao_financeira_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "conta_financeira" (
    "uid" UUID NOT NULL,
    "titular_uid" UUID NOT NULL,
    "familia_uid" UUID,
    "instituicao_uid" UUID,
    "nome" VARCHAR(100) NOT NULL,
    "tipo" "TipoContaFinanceira" NOT NULL,
    "moeda" CHAR(3) NOT NULL DEFAULT 'BRL',
    "saldo_inicial_centavos" BIGINT NOT NULL DEFAULT 0,
    "data_saldo_inicial" DATE NOT NULL,
    "visibilidade" "VisibilidadeRecurso" NOT NULL DEFAULT 'PRIVADO',
    "situacao" "SituacaoConta" NOT NULL DEFAULT 'ATIVA',
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conta_financeira_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "categoria_financeira" (
    "uid" UUID NOT NULL,
    "titular_uid" UUID NOT NULL,
    "familia_uid" UUID,
    "tipo" "TipoCategoria" NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "icone" VARCHAR(60),
    "cor" VARCHAR(9),
    "essencial" BOOLEAN NOT NULL DEFAULT false,
    "visibilidade" "VisibilidadeRecurso" NOT NULL DEFAULT 'PRIVADO',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categoria_financeira_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "lancamento_financeiro" (
    "uid" UUID NOT NULL,
    "titular_uid" UUID NOT NULL,
    "criado_por_uid" UUID NOT NULL,
    "familia_uid" UUID,
    "categoria_uid" UUID,
    "conta_preferencial_uid" UUID,
    "recorrencia_uid" UUID,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "competencia" DATE NOT NULL,
    "vencimento" DATE,
    "ocorrencia_prevista_em" DATE,
    "reconhecido_em" TIMESTAMPTZ(3),
    "situacao" "SituacaoLancamento" NOT NULL DEFAULT 'PREVISTO',
    "visibilidade" "VisibilidadeRecurso" NOT NULL DEFAULT 'PRIVADO',
    "escopo_orcamento" "EscopoOrcamento" NOT NULL DEFAULT 'PESSOAL',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lancamento_financeiro_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "movimentacao_conta" (
    "uid" UUID NOT NULL,
    "conta_uid" UUID NOT NULL,
    "criado_por_uid" UUID NOT NULL,
    "transferencia_uid" UUID,
    "estorno_de_uid" UUID,
    "tipo" "TipoMovimentacaoConta" NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "data_efetivacao" TIMESTAMPTZ(3) NOT NULL,
    "descricao" VARCHAR(255),
    "chave_idempotencia" VARCHAR(120) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_conta_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "liquidacao_lancamento" (
    "uid" UUID NOT NULL,
    "lancamento_uid" UUID NOT NULL,
    "movimentacao_uid" UUID NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "liquidado_em" TIMESTAMPTZ(3) NOT NULL,
    "situacao" "SituacaoLiquidacao" NOT NULL DEFAULT 'CONFIRMADA',

    CONSTRAINT "liquidacao_lancamento_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "transferencia_financeira" (
    "uid" UUID NOT NULL,
    "conta_origem_uid" UUID NOT NULL,
    "conta_destino_uid" UUID NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "efetivada_em" TIMESTAMPTZ(3) NOT NULL,
    "situacao" "SituacaoTransferencia" NOT NULL DEFAULT 'EFETIVADA',
    "chave_idempotencia" VARCHAR(120) NOT NULL,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transferencia_financeira_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "recorrencia_financeira" (
    "uid" UUID NOT NULL,
    "titular_uid" UUID NOT NULL,
    "criado_por_uid" UUID NOT NULL,
    "familia_uid" UUID,
    "categoria_uid" UUID,
    "conta_preferencial_uid" UUID,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "periodicidade" "PeriodicidadeRecorrencia" NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE,
    "proxima_ocorrencia" DATE,
    "visibilidade" "VisibilidadeRecurso" NOT NULL DEFAULT 'PRIVADO',
    "escopo_orcamento" "EscopoOrcamento" NOT NULL DEFAULT 'PESSOAL',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recorrencia_financeira_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "cartao_credito" (
    "uid" UUID NOT NULL,
    "titular_uid" UUID NOT NULL,
    "familia_uid" UUID,
    "nome" VARCHAR(100) NOT NULL,
    "emissor" VARCHAR(100),
    "bandeira" VARCHAR(40),
    "identificador_mascarado" VARCHAR(16),
    "limite_centavos" BIGINT NOT NULL,
    "dia_fechamento" SMALLINT NOT NULL,
    "dia_vencimento" SMALLINT NOT NULL,
    "situacao" "SituacaoCartao" NOT NULL DEFAULT 'ATIVO',
    "visibilidade" "VisibilidadeRecurso" NOT NULL DEFAULT 'PRIVADO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cartao_credito_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "compra_cartao" (
    "uid" UUID NOT NULL,
    "cartao_uid" UUID NOT NULL,
    "categoria_uid" UUID,
    "criado_por_uid" UUID NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "valor_total_centavos" BIGINT NOT NULL,
    "data_compra" DATE NOT NULL,
    "quantidade_parcelas" SMALLINT NOT NULL DEFAULT 1,
    "escopo_orcamento" "EscopoOrcamento" NOT NULL DEFAULT 'PESSOAL',
    "situacao" "SituacaoCompraCartao" NOT NULL DEFAULT 'ATIVA',
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "compra_cartao_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "fatura_cartao" (
    "uid" UUID NOT NULL,
    "cartao_uid" UUID NOT NULL,
    "competencia" DATE NOT NULL,
    "data_fechamento" DATE NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "situacao" "SituacaoFatura" NOT NULL DEFAULT 'ABERTA',
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fatura_cartao_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "parcela_compra" (
    "uid" UUID NOT NULL,
    "compra_uid" UUID NOT NULL,
    "fatura_uid" UUID NOT NULL,
    "numero" SMALLINT NOT NULL,
    "valor_centavos" BIGINT NOT NULL,

    CONSTRAINT "parcela_compra_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "pagamento_fatura" (
    "uid" UUID NOT NULL,
    "fatura_uid" UUID NOT NULL,
    "movimentacao_uid" UUID NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "pago_em" TIMESTAMPTZ(3) NOT NULL,
    "situacao" "SituacaoPagamentoFatura" NOT NULL DEFAULT 'CONFIRMADO',
    "chave_idempotencia" VARCHAR(120) NOT NULL,

    CONSTRAINT "pagamento_fatura_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "ajuste_fatura" (
    "uid" UUID NOT NULL,
    "fatura_uid" UUID NOT NULL,
    "compra_origem_uid" UUID,
    "tipo" "TipoAjusteFatura" NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "motivo" VARCHAR(255) NOT NULL,
    "data_efetiva" DATE NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajuste_fatura_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "orcamento_categoria" (
    "uid" UUID NOT NULL,
    "titular_uid" UUID NOT NULL,
    "familia_uid" UUID,
    "categoria_uid" UUID NOT NULL,
    "escopo" "EscopoOrcamento" NOT NULL,
    "escopo_uid" UUID NOT NULL,
    "competencia" DATE NOT NULL,
    "limite_centavos" BIGINT NOT NULL,
    "situacao" "SituacaoOrcamento" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orcamento_categoria_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "classe_ativo" (
    "uid" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "classe_ativo_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "posicao_investimento" (
    "uid" UUID NOT NULL,
    "titular_uid" UUID NOT NULL,
    "familia_uid" UUID,
    "instituicao_uid" UUID NOT NULL,
    "classe_uid" UUID NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "quantidade" DECIMAL(28,10),
    "valor_referencia_centavos" BIGINT,
    "data_referencia" DATE,
    "visibilidade" "VisibilidadeRecurso" NOT NULL DEFAULT 'PRIVADO',
    "situacao" "SituacaoPosicaoInvestimento" NOT NULL DEFAULT 'ATIVA',
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizada_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "posicao_investimento_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "movimento_investimento" (
    "uid" UUID NOT NULL,
    "posicao_uid" UUID NOT NULL,
    "movimentacao_uid" UUID,
    "tipo" "TipoMovimentoInvestimento" NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "data_movimento" TIMESTAMPTZ(3) NOT NULL,
    "situacao" "SituacaoMovimentoInvestimento" NOT NULL DEFAULT 'CONFIRMADO',
    "chave_idempotencia" VARCHAR(120) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimento_investimento_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "historico_valor_posicao" (
    "uid" UUID NOT NULL,
    "posicao_uid" UUID NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "data_referencia" DATE NOT NULL,
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_valor_posicao_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "preferencia_usuario" (
    "uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "idioma" VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    "moeda" CHAR(3) NOT NULL DEFAULT 'BRL',
    "fuso_horario" VARCHAR(64) NOT NULL DEFAULT 'America/Bahia',
    "valores_ocultos" BOOLEAN NOT NULL DEFAULT false,
    "notificacoes" BOOLEAN NOT NULL DEFAULT true,
    "horizonte_meses" SMALLINT NOT NULL DEFAULT 12,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "preferencia_usuario_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "preferencia_alerta" (
    "uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "tipo" VARCHAR(80) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "preferencia_alerta_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "alerta_financeiro" (
    "uid" UUID NOT NULL,
    "usuario_uid" UUID NOT NULL,
    "familia_uid" UUID,
    "tipo" VARCHAR(80) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "origem_tipo" VARCHAR(60),
    "origem_uid" UUID,
    "competencia" DATE,
    "chave_dedupe" VARCHAR(180) NOT NULL,
    "gravidade" "GravidadeAlerta" NOT NULL,
    "situacao" "SituacaoAlerta" NOT NULL DEFAULT 'ATIVO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lido_em" TIMESTAMPTZ(3),
    "resolvido_em" TIMESTAMPTZ(3),

    CONSTRAINT "alerta_financeiro_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "evento_auditoria" (
    "uid" UUID NOT NULL,
    "usuario_uid" UUID,
    "familia_uid" UUID,
    "sessao_uid" UUID,
    "requisicao_uid" UUID,
    "ocorrido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_origem" VARCHAR(45),
    "tipo_dispositivo" VARCHAR(40),
    "modelo_dispositivo" VARCHAR(100),
    "sistema_operacional" VARCHAR(100),
    "navegador" VARCHAR(100),
    "user_agent" VARCHAR(1024),
    "metodo_http" VARCHAR(10),
    "rota_http" VARCHAR(255),
    "codigo_http" SMALLINT,
    "acao" VARCHAR(100) NOT NULL,
    "recurso" VARCHAR(80),
    "recurso_uid" UUID,
    "resultado" "ResultadoAuditoria" NOT NULL,
    "alteracoes_seguras" JSONB,
    "metadados_seguros" JSONB,

    CONSTRAINT "evento_auditoria_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_usuario_token_hash_key" ON "sessao_usuario"("token_hash");

-- CreateIndex
CREATE INDEX "sessao_usuario_usuario_uid_expira_em_idx" ON "sessao_usuario"("usuario_uid", "expira_em");

-- CreateIndex
CREATE UNIQUE INDEX "token_autenticacao_token_hash_key" ON "token_autenticacao"("token_hash");

-- CreateIndex
CREATE INDEX "token_autenticacao_usuario_uid_tipo_expira_em_idx" ON "token_autenticacao"("usuario_uid", "tipo", "expira_em");

-- CreateIndex
CREATE UNIQUE INDEX "configuracao_mfa_usuario_uid_key" ON "configuracao_mfa"("usuario_uid");

-- CreateIndex
CREATE UNIQUE INDEX "codigo_recuperacao_mfa_codigo_hash_key" ON "codigo_recuperacao_mfa"("codigo_hash");

-- CreateIndex
CREATE INDEX "codigo_recuperacao_mfa_usuario_uid_utilizado_em_idx" ON "codigo_recuperacao_mfa"("usuario_uid", "utilizado_em");

-- CreateIndex
CREATE INDEX "integrante_familia_familia_uid_papel_situacao_idx" ON "integrante_familia"("familia_uid", "papel", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "integrante_familia_familia_uid_usuario_uid_key" ON "integrante_familia"("familia_uid", "usuario_uid");

-- CreateIndex
CREATE UNIQUE INDEX "convite_familia_token_hash_key" ON "convite_familia"("token_hash");

-- CreateIndex
CREATE INDEX "convite_familia_familia_uid_situacao_expira_em_idx" ON "convite_familia"("familia_uid", "situacao", "expira_em");

-- CreateIndex
CREATE INDEX "convite_familia_email_destino_situacao_idx" ON "convite_familia"("email_destino", "situacao");

-- CreateIndex
CREATE INDEX "permissao_recurso_familia_familia_uid_tipo_recurso_recurso__idx" ON "permissao_recurso_familia"("familia_uid", "tipo_recurso", "recurso_uid");

-- CreateIndex
CREATE UNIQUE INDEX "permissao_recurso_familia_familia_uid_usuario_uid_tipo_recu_key" ON "permissao_recurso_familia"("familia_uid", "usuario_uid", "tipo_recurso", "recurso_uid");

-- CreateIndex
CREATE INDEX "conta_financeira_titular_uid_situacao_idx" ON "conta_financeira"("titular_uid", "situacao");

-- CreateIndex
CREATE INDEX "conta_financeira_familia_uid_visibilidade_idx" ON "conta_financeira"("familia_uid", "visibilidade");

-- CreateIndex
CREATE INDEX "categoria_financeira_titular_uid_tipo_ativa_idx" ON "categoria_financeira"("titular_uid", "tipo", "ativa");

-- CreateIndex
CREATE INDEX "categoria_financeira_familia_uid_tipo_ativa_idx" ON "categoria_financeira"("familia_uid", "tipo", "ativa");

-- CreateIndex
CREATE INDEX "lancamento_financeiro_titular_uid_competencia_tipo_situacao_idx" ON "lancamento_financeiro"("titular_uid", "competencia", "tipo", "situacao");

-- CreateIndex
CREATE INDEX "lancamento_financeiro_familia_uid_competencia_visibilidade_idx" ON "lancamento_financeiro"("familia_uid", "competencia", "visibilidade");

-- CreateIndex
CREATE INDEX "lancamento_financeiro_vencimento_situacao_idx" ON "lancamento_financeiro"("vencimento", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "lancamento_financeiro_recorrencia_uid_ocorrencia_prevista_e_key" ON "lancamento_financeiro"("recorrencia_uid", "ocorrencia_prevista_em");

-- CreateIndex
CREATE UNIQUE INDEX "movimentacao_conta_estorno_de_uid_key" ON "movimentacao_conta"("estorno_de_uid");

-- CreateIndex
CREATE UNIQUE INDEX "movimentacao_conta_chave_idempotencia_key" ON "movimentacao_conta"("chave_idempotencia");

-- CreateIndex
CREATE INDEX "movimentacao_conta_conta_uid_data_efetivacao_idx" ON "movimentacao_conta"("conta_uid", "data_efetivacao");

-- CreateIndex
CREATE INDEX "movimentacao_conta_transferencia_uid_idx" ON "movimentacao_conta"("transferencia_uid");

-- CreateIndex
CREATE UNIQUE INDEX "liquidacao_lancamento_movimentacao_uid_key" ON "liquidacao_lancamento"("movimentacao_uid");

-- CreateIndex
CREATE INDEX "liquidacao_lancamento_lancamento_uid_liquidado_em_idx" ON "liquidacao_lancamento"("lancamento_uid", "liquidado_em");

-- CreateIndex
CREATE UNIQUE INDEX "transferencia_financeira_chave_idempotencia_key" ON "transferencia_financeira"("chave_idempotencia");

-- CreateIndex
CREATE INDEX "transferencia_financeira_conta_origem_uid_efetivada_em_idx" ON "transferencia_financeira"("conta_origem_uid", "efetivada_em");

-- CreateIndex
CREATE INDEX "transferencia_financeira_conta_destino_uid_efetivada_em_idx" ON "transferencia_financeira"("conta_destino_uid", "efetivada_em");

-- CreateIndex
CREATE INDEX "recorrencia_financeira_ativa_proxima_ocorrencia_idx" ON "recorrencia_financeira"("ativa", "proxima_ocorrencia");

-- CreateIndex
CREATE INDEX "recorrencia_financeira_titular_uid_ativa_idx" ON "recorrencia_financeira"("titular_uid", "ativa");

-- CreateIndex
CREATE INDEX "cartao_credito_titular_uid_situacao_idx" ON "cartao_credito"("titular_uid", "situacao");

-- CreateIndex
CREATE INDEX "cartao_credito_familia_uid_visibilidade_idx" ON "cartao_credito"("familia_uid", "visibilidade");

-- CreateIndex
CREATE INDEX "compra_cartao_cartao_uid_data_compra_idx" ON "compra_cartao"("cartao_uid", "data_compra");

-- CreateIndex
CREATE INDEX "fatura_cartao_data_vencimento_situacao_idx" ON "fatura_cartao"("data_vencimento", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "fatura_cartao_cartao_uid_competencia_key" ON "fatura_cartao"("cartao_uid", "competencia");

-- CreateIndex
CREATE INDEX "parcela_compra_fatura_uid_idx" ON "parcela_compra"("fatura_uid");

-- CreateIndex
CREATE UNIQUE INDEX "parcela_compra_compra_uid_numero_key" ON "parcela_compra"("compra_uid", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_fatura_movimentacao_uid_key" ON "pagamento_fatura"("movimentacao_uid");

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_fatura_chave_idempotencia_key" ON "pagamento_fatura"("chave_idempotencia");

-- CreateIndex
CREATE INDEX "pagamento_fatura_fatura_uid_pago_em_idx" ON "pagamento_fatura"("fatura_uid", "pago_em");

-- CreateIndex
CREATE INDEX "ajuste_fatura_fatura_uid_data_efetiva_idx" ON "ajuste_fatura"("fatura_uid", "data_efetiva");

-- CreateIndex
CREATE INDEX "orcamento_categoria_titular_uid_competencia_idx" ON "orcamento_categoria"("titular_uid", "competencia");

-- CreateIndex
CREATE INDEX "orcamento_categoria_familia_uid_competencia_idx" ON "orcamento_categoria"("familia_uid", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "orcamento_categoria_escopo_escopo_uid_categoria_uid_compete_key" ON "orcamento_categoria"("escopo", "escopo_uid", "categoria_uid", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "classe_ativo_nome_key" ON "classe_ativo"("nome");

-- CreateIndex
CREATE INDEX "posicao_investimento_titular_uid_situacao_idx" ON "posicao_investimento"("titular_uid", "situacao");

-- CreateIndex
CREATE INDEX "posicao_investimento_familia_uid_visibilidade_idx" ON "posicao_investimento"("familia_uid", "visibilidade");

-- CreateIndex
CREATE UNIQUE INDEX "movimento_investimento_movimentacao_uid_key" ON "movimento_investimento"("movimentacao_uid");

-- CreateIndex
CREATE UNIQUE INDEX "movimento_investimento_chave_idempotencia_key" ON "movimento_investimento"("chave_idempotencia");

-- CreateIndex
CREATE INDEX "movimento_investimento_posicao_uid_data_movimento_idx" ON "movimento_investimento"("posicao_uid", "data_movimento");

-- CreateIndex
CREATE UNIQUE INDEX "historico_valor_posicao_posicao_uid_data_referencia_key" ON "historico_valor_posicao"("posicao_uid", "data_referencia");

-- CreateIndex
CREATE UNIQUE INDEX "preferencia_usuario_usuario_uid_key" ON "preferencia_usuario"("usuario_uid");

-- CreateIndex
CREATE UNIQUE INDEX "preferencia_alerta_usuario_uid_tipo_key" ON "preferencia_alerta"("usuario_uid", "tipo");

-- CreateIndex
CREATE INDEX "alerta_financeiro_usuario_uid_situacao_criado_em_idx" ON "alerta_financeiro"("usuario_uid", "situacao", "criado_em");

-- CreateIndex
CREATE INDEX "alerta_financeiro_familia_uid_situacao_idx" ON "alerta_financeiro"("familia_uid", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "alerta_financeiro_usuario_uid_chave_dedupe_key" ON "alerta_financeiro"("usuario_uid", "chave_dedupe");

-- CreateIndex
CREATE INDEX "evento_auditoria_usuario_uid_ocorrido_em_idx" ON "evento_auditoria"("usuario_uid", "ocorrido_em");

-- CreateIndex
CREATE INDEX "evento_auditoria_familia_uid_ocorrido_em_idx" ON "evento_auditoria"("familia_uid", "ocorrido_em");

-- CreateIndex
CREATE INDEX "evento_auditoria_recurso_recurso_uid_ocorrido_em_idx" ON "evento_auditoria"("recurso", "recurso_uid", "ocorrido_em");

-- CreateIndex
CREATE INDEX "evento_auditoria_ip_origem_ocorrido_em_idx" ON "evento_auditoria"("ip_origem", "ocorrido_em");

-- CreateIndex
CREATE INDEX "evento_auditoria_resultado_ocorrido_em_idx" ON "evento_auditoria"("resultado", "ocorrido_em");

-- AddForeignKey
ALTER TABLE "sessao_usuario" ADD CONSTRAINT "sessao_usuario_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_autenticacao" ADD CONSTRAINT "token_autenticacao_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracao_mfa" ADD CONSTRAINT "configuracao_mfa_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigo_recuperacao_mfa" ADD CONSTRAINT "codigo_recuperacao_mfa_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "familia" ADD CONSTRAINT "familia_criador_uid_fkey" FOREIGN KEY ("criador_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrante_familia" ADD CONSTRAINT "integrante_familia_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrante_familia" ADD CONSTRAINT "integrante_familia_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_familia" ADD CONSTRAINT "convite_familia_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_familia" ADD CONSTRAINT "convite_familia_emitido_por_uid_fkey" FOREIGN KEY ("emitido_por_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_familia" ADD CONSTRAINT "convite_familia_aceito_por_uid_fkey" FOREIGN KEY ("aceito_por_uid") REFERENCES "usuario"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissao_recurso_familia" ADD CONSTRAINT "permissao_recurso_familia_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissao_recurso_familia" ADD CONSTRAINT "permissao_recurso_familia_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissao_recurso_familia" ADD CONSTRAINT "permissao_recurso_familia_concedido_por_uid_fkey" FOREIGN KEY ("concedido_por_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta_financeira" ADD CONSTRAINT "conta_financeira_titular_uid_fkey" FOREIGN KEY ("titular_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta_financeira" ADD CONSTRAINT "conta_financeira_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta_financeira" ADD CONSTRAINT "conta_financeira_instituicao_uid_fkey" FOREIGN KEY ("instituicao_uid") REFERENCES "instituicao_financeira"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria_financeira" ADD CONSTRAINT "categoria_financeira_titular_uid_fkey" FOREIGN KEY ("titular_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria_financeira" ADD CONSTRAINT "categoria_financeira_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_titular_uid_fkey" FOREIGN KEY ("titular_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_criado_por_uid_fkey" FOREIGN KEY ("criado_por_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_categoria_uid_fkey" FOREIGN KEY ("categoria_uid") REFERENCES "categoria_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_conta_preferencial_uid_fkey" FOREIGN KEY ("conta_preferencial_uid") REFERENCES "conta_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento_financeiro" ADD CONSTRAINT "lancamento_financeiro_recorrencia_uid_fkey" FOREIGN KEY ("recorrencia_uid") REFERENCES "recorrencia_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_conta" ADD CONSTRAINT "movimentacao_conta_conta_uid_fkey" FOREIGN KEY ("conta_uid") REFERENCES "conta_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_conta" ADD CONSTRAINT "movimentacao_conta_criado_por_uid_fkey" FOREIGN KEY ("criado_por_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_conta" ADD CONSTRAINT "movimentacao_conta_transferencia_uid_fkey" FOREIGN KEY ("transferencia_uid") REFERENCES "transferencia_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_conta" ADD CONSTRAINT "movimentacao_conta_estorno_de_uid_fkey" FOREIGN KEY ("estorno_de_uid") REFERENCES "movimentacao_conta"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacao_lancamento" ADD CONSTRAINT "liquidacao_lancamento_lancamento_uid_fkey" FOREIGN KEY ("lancamento_uid") REFERENCES "lancamento_financeiro"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidacao_lancamento" ADD CONSTRAINT "liquidacao_lancamento_movimentacao_uid_fkey" FOREIGN KEY ("movimentacao_uid") REFERENCES "movimentacao_conta"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_financeira" ADD CONSTRAINT "transferencia_financeira_conta_origem_uid_fkey" FOREIGN KEY ("conta_origem_uid") REFERENCES "conta_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_financeira" ADD CONSTRAINT "transferencia_financeira_conta_destino_uid_fkey" FOREIGN KEY ("conta_destino_uid") REFERENCES "conta_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencia_financeira" ADD CONSTRAINT "recorrencia_financeira_titular_uid_fkey" FOREIGN KEY ("titular_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencia_financeira" ADD CONSTRAINT "recorrencia_financeira_criado_por_uid_fkey" FOREIGN KEY ("criado_por_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencia_financeira" ADD CONSTRAINT "recorrencia_financeira_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencia_financeira" ADD CONSTRAINT "recorrencia_financeira_categoria_uid_fkey" FOREIGN KEY ("categoria_uid") REFERENCES "categoria_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencia_financeira" ADD CONSTRAINT "recorrencia_financeira_conta_preferencial_uid_fkey" FOREIGN KEY ("conta_preferencial_uid") REFERENCES "conta_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartao_credito" ADD CONSTRAINT "cartao_credito_titular_uid_fkey" FOREIGN KEY ("titular_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartao_credito" ADD CONSTRAINT "cartao_credito_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_cartao" ADD CONSTRAINT "compra_cartao_cartao_uid_fkey" FOREIGN KEY ("cartao_uid") REFERENCES "cartao_credito"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_cartao" ADD CONSTRAINT "compra_cartao_categoria_uid_fkey" FOREIGN KEY ("categoria_uid") REFERENCES "categoria_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_cartao" ADD CONSTRAINT "compra_cartao_criado_por_uid_fkey" FOREIGN KEY ("criado_por_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fatura_cartao" ADD CONSTRAINT "fatura_cartao_cartao_uid_fkey" FOREIGN KEY ("cartao_uid") REFERENCES "cartao_credito"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela_compra" ADD CONSTRAINT "parcela_compra_compra_uid_fkey" FOREIGN KEY ("compra_uid") REFERENCES "compra_cartao"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela_compra" ADD CONSTRAINT "parcela_compra_fatura_uid_fkey" FOREIGN KEY ("fatura_uid") REFERENCES "fatura_cartao"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_fatura" ADD CONSTRAINT "pagamento_fatura_fatura_uid_fkey" FOREIGN KEY ("fatura_uid") REFERENCES "fatura_cartao"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_fatura" ADD CONSTRAINT "pagamento_fatura_movimentacao_uid_fkey" FOREIGN KEY ("movimentacao_uid") REFERENCES "movimentacao_conta"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_fatura" ADD CONSTRAINT "ajuste_fatura_fatura_uid_fkey" FOREIGN KEY ("fatura_uid") REFERENCES "fatura_cartao"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_fatura" ADD CONSTRAINT "ajuste_fatura_compra_origem_uid_fkey" FOREIGN KEY ("compra_origem_uid") REFERENCES "compra_cartao"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_categoria" ADD CONSTRAINT "orcamento_categoria_titular_uid_fkey" FOREIGN KEY ("titular_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_categoria" ADD CONSTRAINT "orcamento_categoria_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_categoria" ADD CONSTRAINT "orcamento_categoria_categoria_uid_fkey" FOREIGN KEY ("categoria_uid") REFERENCES "categoria_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posicao_investimento" ADD CONSTRAINT "posicao_investimento_titular_uid_fkey" FOREIGN KEY ("titular_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posicao_investimento" ADD CONSTRAINT "posicao_investimento_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posicao_investimento" ADD CONSTRAINT "posicao_investimento_instituicao_uid_fkey" FOREIGN KEY ("instituicao_uid") REFERENCES "instituicao_financeira"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posicao_investimento" ADD CONSTRAINT "posicao_investimento_classe_uid_fkey" FOREIGN KEY ("classe_uid") REFERENCES "classe_ativo"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_investimento" ADD CONSTRAINT "movimento_investimento_posicao_uid_fkey" FOREIGN KEY ("posicao_uid") REFERENCES "posicao_investimento"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_investimento" ADD CONSTRAINT "movimento_investimento_movimentacao_uid_fkey" FOREIGN KEY ("movimentacao_uid") REFERENCES "movimentacao_conta"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_valor_posicao" ADD CONSTRAINT "historico_valor_posicao_posicao_uid_fkey" FOREIGN KEY ("posicao_uid") REFERENCES "posicao_investimento"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencia_usuario" ADD CONSTRAINT "preferencia_usuario_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencia_alerta" ADD CONSTRAINT "preferencia_alerta_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_financeiro" ADD CONSTRAINT "alerta_financeiro_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_financeiro" ADD CONSTRAINT "alerta_financeiro_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_auditoria" ADD CONSTRAINT "evento_auditoria_usuario_uid_fkey" FOREIGN KEY ("usuario_uid") REFERENCES "usuario"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_auditoria" ADD CONSTRAINT "evento_auditoria_familia_uid_fkey" FOREIGN KEY ("familia_uid") REFERENCES "familia"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_auditoria" ADD CONSTRAINT "evento_auditoria_sessao_uid_fkey" FOREIGN KEY ("sessao_uid") REFERENCES "sessao_usuario"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- Money Marques — constraints que o Prisma nao expressa.
-- Aplicar na migration inicial (anexar ao migration.sql gerado por `prisma migrate dev --create-only`).

-- ─── Usuario / convites ────────────────────────────────────────────────────
ALTER TABLE usuario ADD CONSTRAINT usuario_email_minusculo CHECK (email = lower(email));
ALTER TABLE convite_familia ADD CONSTRAINT convite_email_minusculo CHECK (email_destino = lower(email_destino));

-- Um unico convite pendente por familia + e-mail
CREATE UNIQUE INDEX convite_pendente_unico
  ON convite_familia (familia_uid, email_destino) WHERE situacao = 'PENDENTE';

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
