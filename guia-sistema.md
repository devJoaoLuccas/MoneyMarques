# Instruções de Desenvolvimento — Money Marques

> Este arquivo orienta o Claude Code na implementação de funcionalidades. Ele combina o **contexto do negócio** (escopo do projeto) com as **regras de engenharia** que devem ser seguidas em toda tarefa. Para regras visuais, consulte `CLAUDE-frontend.md`.

---

## 1. Visão do produto

Plataforma web responsiva de **gestão financeira familiar**, para acompanhar receitas, despesas, cartões de crédito, investimentos e a previsão do orçamento dos próximos meses.

**Diferencial:** gerenciar, na mesma plataforma, as **finanças compartilhadas da família** e as **finanças pessoais de cada integrante**, com permissões de acesso.

**Princípio mais importante do MVP: confiabilidade.** O sistema não pode confundir:
- gastos no cartão com pagamentos de fatura;
- transferências com receitas;
- aportes em investimentos com despesas de consumo.

Na dúvida entre uma solução mais simples e correta e outra mais completa e arriscada, escolha a primeira.

---

## 2. Limites do MVP

| Característica | Definição |
|---|---|
| Público-alvo | Famílias com dois ou mais integrantes |
| Plataforma | Web responsiva (desktop e mobile) |
| Alimentação de dados | Lançamentos **exclusivamente manuais** |
| Moeda inicial | Real brasileiro (BRL) |
| Gestão de contas | Contas pessoais e compartilhadas |
| Cartões de crédito | Múltiplos cartões e compras parceladas |
| Investimentos | Acompanhamento manual de posições e movimentações |
| Previsão financeira | Receitas, despesas recorrentes e faturas futuras |
| Autenticação | Senha + verificação de e-mail + **MFA (TOTP) com códigos de recuperação** |
| Alertas | Alertas financeiros (vencimentos, limite de orçamento) com preferências por usuário |
| Integração bancária | **Fora do MVP** |

---

## 3. Requisitos funcionais prioritários

| Id | Módulo | Funcionalidade |
|---|---|---|
| RF-001 | Família | Criar grupo familiar e convidar integrantes |
| RF-002 | Acesso | Configurar permissões e visibilidade dos dados |
| RF-003 | Contas | Cadastrar contas e saldos iniciais |
| RF-004 | Transações | Registrar receitas, despesas e transferências |
| RF-005 | Recorrências | Configurar ganhos e contas fixas |
| RF-006 | Cartões | Cadastrar cartões, limites e vencimentos |
| RF-007 | Cartões | Registrar compras parceladas e faturas |
| RF-008 | Investimentos | Registrar posições, aportes e resgates |
| RF-009 | Planejamento | Projetar saldos dos próximos 12 meses |
| RF-010 | Dashboard | Visualizar gastos, receitas e patrimônio |
| RF-011 | Orçamentos | Definir limites por categoria |
| RF-012 | Relatórios | Consultar períodos, categorias e integrantes |
| RF-013 | Segurança | Autenticação, autorização e auditoria |
| RF-014 | Segurança | MFA (TOTP) e códigos de recuperação |
| RF-015 | Alertas | Alertas financeiros e preferências de notificação |
| RF-016 | Investimentos | Histórico de valor das posições (base da rentabilidade) |

Ao implementar, referencie o(s) código(s) RF correspondente(s) nos testes, commits e descrições de PR.

---

## 4. Acesso familiar

Perfis iniciais:

- **Administrador:** gerencia a família, os convites e as permissões.
- **Integrante:** administra os próprios lançamentos e os recursos compartilhados autorizados.
- **Visualizador:** consulta as informações às quais recebeu acesso, sem poder alterá-las.

Regras:
- Uma **conta pessoal não fica visível automaticamente** para todos os integrantes.
- Acesso a cartões, investimentos e relatórios consolidados deve ser definido explicitamente por permissão.
- Toda checagem de permissão acontece **no servidor**, nunca apenas na interface.

> **Decisão adotada (lacuna do escopo):** a granularidade exata não foi definida. Adotado o padrão mais restritivo (negar por padrão): a ACL (`PermissaoRecursoFamilia`) é concedida apenas sobre recursos-raiz — `CONTA`, `CARTAO`, `ORCAMENTO`, `POSICAO_INVESTIMENTO` e `RELATORIO_CONSOLIDADO` (`recursoUid` = uid da família). Lançamentos, compras e parcelas herdam a permissão da conta/cartão a que pertencem. `podeCriar` significa criar itens filhos. Revisar quando o escopo definir mais detalhes.

---

## 5. Regras de negócio essenciais

- **Cartão de crédito:** a compra compromete o **limite** imediatamente, mas **não reduz o saldo bancário**. O saldo da conta só diminui quando a **fatura é efetivamente paga**. Evitar dupla contabilização da despesa.
- **Compras parceladas:** cada parcela é associada à **fatura correspondente**, respeitando fechamento e vencimento do cartão. O sistema exibe as obrigações dos próximos meses.
- **Receitas e despesas recorrentes:** cada recorrência gera **lançamentos previstos**, com vencimento e valor esperado. A **confirmação** do pagamento/recebimento é registrada separadamente, permitindo atrasos, antecipações e ajustes pontuais.
- **Transferências:** entre contas próprias ou compartilhadas, **não são renda nova nem despesa de consumo**. Registrar **as duas pontas** da transferência.
- **Investimentos:** aportes e resgates são **movimentações patrimoniais**. A rentabilidade é calculada separadamente, distinguindo valorização de novos aportes.
- **Projeções:** consideram receitas esperadas, despesas fixas, parcelas, gastos planejados e saldo inicial. Receitas ainda não recebidas aparecem como **previstas**, nunca como dinheiro disponível.
- **Estornos:** nunca editam nem apagam o registro original. Geram nova `MovimentacaoConta` do tipo `ESTORNO` com `estornoDeUid` apontando para a original (uma movimentação só é estornada uma vez); a situação do pagamento, liquidação, transferência ou movimento é marcada como estornada e a situação do lançamento/fatura é recalculada só com itens confirmados.
- **Cancelamento de compra no cartão:** a fonte da verdade é `CompraCartao.situacao`. `AjusteFatura` do tipo `ESTORNO` só é usado quando a fatura já está fechada/paga; nunca combinar os dois para a mesma parcela.
- **Limite do cartão:** limite utilizado = parcelas de compras ativas em faturas não pagas. Decisão conservadora: com fatura parcialmente paga, o limite só é liberado quando a fatura fica paga.
- **Orçamento de origem:** todo lançamento e compra tem `escopoOrcamento` (`PESSOAL` ou `FAMILIAR`). `FAMILIAR` conta só no orçamento familiar e aparece na visão pessoal apenas como consulta, sem somar.
- **Saldos e faturas não são colunas:** saldo da conta e valor da fatura são calculados a partir das movimentações, parcelas e ajustes.
- **Recorrência no cartão:** fora do MVP (assinaturas em cartão não geram compras automáticas). Dia 29–31 em mês curto usa o último dia do mês.
- **Catálogos:** instituições financeiras e classes de ativo são tabelas globais administradas pela plataforma; cadastro pelo usuário fica fora do MVP.
- **Família:** deve ser possível identificar **quem realizou** a despesa e a **qual orçamento** ela pertence, evitando contagem em dobro entre a visão pessoal e a familiar.

---

## 6. Roadmap de telas (ordem recomendada)

1. **Autenticação e família:** login, cadastro, criação do grupo, convites e permissões.
2. **Dashboard:** visão pessoal e familiar, KPIs, gráficos, faturas e próximos vencimentos.
3. **Transações e contas:** contas bancárias, saldo, histórico, lançamentos e transferências.
4. **Cartões de crédito:** cartões, compras, parcelamentos, faturas e pagamentos.
5. **Planejamento:** recorrências, receitas fixas, calendário, projeções e orçamento.
6. **Investimentos:** posições, aportes, resgates e evolução patrimonial.
7. **Relatórios e configurações:** análises por período e integrante, perfis, permissões e auditoria.

Respeitar essa ordem ao planejar trabalho, salvo solicitação explícita em contrário.

---

## 7. Regras de engenharia

### 7.1 Antes de implementar
Antes de escrever código, identifique e explicite:
- **Módulo** envolvido;
- **Atores** (Administrador, Integrante, Visualizador);
- **Permissões** necessárias;
- **Validações** de entrada e de negócio;
- **Efeitos colaterais** (ex.: pagar fatura altera saldo da conta; transferência afeta duas contas);
- **Histórico** (o que precisa ser preservado/auditado);
- **Notificações** envolvidas.

### 7.2 Fluxo SDD → TDD → implementação
1. **SDD:** confirme os requisitos e os **critérios de aceite** antes de codar.
2. **TDD:** escreva testes para **regras de negócio** e **fluxos críticos** (cartão x saldo, transferência com duas pontas, recorrência prevista x confirmada, projeções, permissões).
3. **Implementação:** codifique o necessário para os testes passarem.
4. **Execução:** rode os testes relevantes e informe o resultado.

### 7.3 Dados e integridade
- Preserve **dados históricos** e **integridade referencial**.
- Prefira **inativação / soft delete** onde existam relações ou histórico (contas, cartões, categorias, integrantes, lançamentos).
- Evite exclusão física de registros que compõem histórico financeiro.
- Usuários e famílias nunca são excluídos fisicamente (`excluidoEm` / `encerradaEm`); a auditoria é append-only (trigger no banco).
- **E-mails nunca ficam em texto puro no banco** (`Usuario`, `ConviteFamilia`): gravam-se o **HMAC-SHA-256** do e-mail normalizado em minúsculas (`emailHmac`, chave `EMAIL_HMAC_KEY`) como identificador de login/busca/unicidade e uma **cópia cifrada AES-256-GCM** (`emailCriptografado`, chave `EMAIL_ENCRYPTION_KEY`) usada apenas para enviar e-mails e exibir o endereço ao próprio usuário. HMAC é irreversível; a cópia cifrada existe porque o sistema precisa do endereço. As chaves são distintas entre si e das de token/MFA.
- Valores monetários em centavos (`BigInt`), convertidos na camada de API.
- Constraints que o Prisma não expressa ficam em `backend/prisma/constraints.sql` e são anexadas à migration inicial.
- Horizonte padrão de projeção: 12 meses (RF-009).

### 7.4 Escopo
- **Não implemente funcionalidades fora do MVP** descrito acima sem solicitação explícita.
- Integrações futuras (ex.: integração bancária) devem permanecer **desacopladas** e **nunca ser simuladas como concluídas**.

### 7.5 Arquitetura e camadas
- **Não coloque regra de negócio em controllers ou componentes de apresentação.**
- **Validações críticas existem no servidor**, mesmo quando também houver validação na interface (a validação do cliente é conveniência, não segurança).
- Respeite a **arquitetura e os padrões já existentes** no repositório. Este guia define o destino do projeto, mas **não autoriza reescrever convenções existentes** sem necessidade.

### 7.6 Decisões não especificadas
- Quando uma decisão necessária **não estiver especificada**, **registre a lacuna** e escolha a **alternativa mais conservadora e reversível**.
- **Não assuma** regras institucionais, prazos, destinatários, limites ou cálculos ausentes.

---

## 8. Checklist por funcionalidade

- [ ] Módulo, atores, permissões, validações, efeitos colaterais, histórico e notificações identificados
- [ ] Requisitos (RF) e critérios de aceite confirmados
- [ ] Testes escritos antes da implementação para regras de negócio e fluxos críticos
- [ ] Regra de negócio fora de controllers e componentes de apresentação
- [ ] Validações críticas e checagem de permissão no servidor
- [ ] Histórico e integridade referencial preservados (soft delete/inativação quando aplicável)
- [ ] Nada fora do MVP foi implementado; integrações futuras não simuladas
- [ ] Lacunas registradas, com a alternativa conservadora e reversível adotada
- [ ] Testes relevantes executados e resultado informado
