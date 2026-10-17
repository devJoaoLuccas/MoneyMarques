# MONEY MARQUES: Implementação do Menu Lateral e do Dashboard Financeiro

> Documento de instrução para implementação (SDD + TDD + Clean Code).
> Fontes: Módulo 03 (Dashboard Financeiro v1.0), Módulo 02 (Gestão Familiar), Módulo 01 (Autenticação), Design System Cyber Finance v1.0 e imagem "Componente Único: Menu Lateral".

---

## 1. Objetivo

Adicionar ao sistema, nesta ordem:

1. **MenuLateral**: componente único de navegação, reutilizado em todas as telas (desktop e mobile).
2. **Dashboard Financeiro**: seis telas (DASH-001 a DASH-006) com KPIs, gráficos, cartões, patrimônio, projeções e vencimentos.

**Princípio:** o Dashboard apenas **consulta** dados consolidados. Ele não cria saldos próprios nem duplica lógica financeira. Precisão e segurança das agregações têm prioridade sobre efeitos visuais.

---

## 2. Stack e convenções

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript, React Router, TanStack Query, Axios, React Hook Form + Zod, Recharts |
| Backend | NestJS + PostgreSQL/Prisma. Redis só se houver medição que justifique. BullMQ para processamentos assíncronos |
| Dinheiro | `Decimal` ou inteiros em centavos. **Nunca `float`** |

**Nomenclatura (português brasileiro):**
- Componentes e classes: `PascalCase`
- Funções e variáveis: `camelCase` (ex.: `buscarResumoFinanceiro()`, `useResumoFinanceiro()`)
- Tabelas e colunas: `snake_case` sem acentos (ex.: `resumo_financeiro`, `data_referencia`)
- Preservar nomes de bibliotecas e palavras reservadas

**Padrões globais:** BRL (`R$ 1.250,00`), datas `DD/MM/AAAA`, interface em `America/Bahia` (instantes persistidos em UTC), numerais tabulares em valores monetários.

**Tokens (usar sempre do Design System, sem hexadecimais locais):**
Background `#0A0A12` · Surface `#121826` · Surface Secondary `#1A2235` · Primary `#7C3AED` · Primary Hover `#6D28D9` · Ciano `#22D3EE` · Magenta `#FF2DA6` · Positivo `#00E6A8` · Atenção `#FFB020` · Negativo `#FF5A7A` · Border `#29334A` · Focus Ring `#22D3EE`.
Fontes: Inter (interface) e Space Grotesk (marca e títulos especiais).

---

## 3. Parte A: Menu Lateral (componente único)

### 3.1 Regras gerais
- Existe **um único** `MenuLateral`. Proibido criar sidebar própria por tela.
- Logo oficial (monograma MM com coroa + "MONEY MARQUES"). Não recriar nem substituir por ícone genérico.
- Estilo: fundo escuro, borda com glow ciano/magenta moderado, item ativo com gradiente violeta→magenta.
- Acessibilidade: navegação por teclado, foco visível (`#22D3EE`), `aria-current="page"` no item ativo, `aria-expanded` nos itens com submenu, área de toque mínima de 44 × 44 px, respeito a `prefers-reduced-motion`.

### 3.2 Estrutura de navegação (conforme a imagem de referência)

| Ordem | Item | Submenu |
|---|---|---|
| 1 | Início | (nenhum) |
| 2 | Minha Vida Financeira | (nenhum) |
| 3 | Gestão Familiar | Visão Geral · Integrantes · Convites · Permissões · Configurações |
| 4 | Planejamento | (nenhum) |
| 5 | Metas | (nenhum) |
| 6 | Investimentos | (nenhum) |
| 7 | Relatórios | (nenhum) |
| Rodapé | Bloco de perfil | Avatar, nome, papel (ex.: Administrador) e ícone de configurações |

Implementar a lista como **configuração de dados** (array tipado `ItemMenu[]`), não como JSX repetido. Cada item: `id`, `rotulo`, `icone`, `rota`, `filhos?`, `permissaoMinima?`.

### 3.3 Estados obrigatórios

1. **Normal**: itens em repouso.
2. **Hover**: realce sutil no item.
3. **Ativo**: item (e subitem, se houver) com gradiente e destaque.
4. **Submenu expandido**: seta rotacionada, subitens com marcador (bolinha).
5. **Compacto (desktop, recolhido)**: apenas ícones, indicador de item ativo, avatar no rodapé, `tooltip` com o rótulo.

### 3.4 Mobile
- Abaixo de 1024 px: barra superior com hambúrguer, logo central, sino de notificações e avatar.
- O menu abre como **drawer** (botão de fechar "X"), com a mesma estrutura e hierarquia do desktop.
- Foco preso dentro do drawer enquanto aberto; fecha com `Esc` e ao navegar.
- Conforme o Design System, mobile até 639 px usa barra inferior. **Decisão necessária:** drawer, barra inferior ou ambos (ver seção 8).

### 3.5 Visibilidade por permissão
- Itens administrativos (Convites, Permissões, Configurações) só aparecem para quem tem permissão (CA-FAM-007).
- A ocultação no frontend é só UX. A autorização real é validada no backend em toda requisição.

### 3.6 Tarefas
- [ ] Criar `src/componentes/MenuLateral/` (`MenuLateral.tsx`, `ItemMenu.tsx`, `SubmenuMenu.tsx`, `PerfilMenu.tsx`, `menuConfig.ts`, `useMenuLateral.ts`)
- [ ] Criar `LayoutAutenticado` (MenuLateral + `CabecalhoFinanceiro` + `<Outlet />`) e aplicá-lo a todas as rotas privadas
- [ ] Persistir estado recolhido/expandido por usuário (preferência de UI, sem dado sensível)
- [ ] Testes de componente: cinco estados, teclado, `aria-*`, filtragem por permissão

---

## 4. Parte B: Dashboard Financeiro

### 4.1 Rotas e telas

| Id | Tela | Rota sugerida |
|---|---|---|
| DASH-001 | Visão Geral Financeira | `/painel` |
| DASH-002 | Receitas e Despesas | `/painel/receitas-despesas` |
| DASH-003 | Cartões e Faturas | `/painel/cartoes` |
| DASH-004 | Patrimônio e Investimentos | `/painel/patrimonio` |
| DASH-005 | Planejamento e Projeção | `/painel/projecoes` |
| DASH-006 | Vencimentos e Alertas | `/painel/vencimentos` |

Todas exigem sessão válida e MFA concluído (Módulo 01) e família ativa (Módulo 02). Cada tela deve ter versão desktop e mobile.

### 4.2 Cabeçalho global (`CabecalhoFinanceiro`)
Família ativa · visão **PESSOAL | FAMILIAR** · período (mês/ano) · botão ocultar valores · acesso ao perfil.
- Trocar família ou visão **invalida o cache** do contexto anterior (RN-DASH-002).
- Filtros globais sincronizados com a URL, sem dados sigilosos nela.

### 4.3 DASH-001: Visão Geral
- **KPIs (linha 1):** Patrimônio Líquido, Saldo Disponível em Contas, Receitas do Mês, Despesas do Mês. Destaque separado: **Saldo Projetado do Mês**. Cada KPI mostra valor, escopo e referência temporal.
- **Área analítica:** gráfico Receitas × Despesas (6 meses), despesas por categoria, cartões e faturas, próximos vencimentos, evolução patrimonial, ações rápidas.
- **Mobile:** KPIs empilhados ou em 2 colunas, gráficos em largura total, sem tabelas largas.

### 4.4 DASH-002: Receitas e Despesas
Série temporal, comparação com período anterior, distribuição e detalhamento por categoria, maiores lançamentos. Filtros: período, categoria, origem pessoal/compartilhada. **Realizado ≠ previsto**, sempre com legenda.

### 4.5 DASH-003: Cartões e Faturas
Por cartão autorizado: nome, identificador mascarado, limite total/comprometido/disponível, fechamento, vencimento, fatura aberta, situação, próximas faturas e parcelas. Link para o módulo Cartões.

### 4.6 DASH-004: Patrimônio e Investimentos
Patrimônio bruto, passivos, patrimônio líquido, total investido, evolução, resumo por instituição/classe. **Exibir a data da última atualização manual**. Nunca inventar preço ou rentabilidade.

### 4.7 DASH-005: Planejamento e Projeção
Horizontes: mês atual, 3, 6 e 12 meses. Distinguir saldo final mensal de fluxo de caixa diário. Negativos sinalizados de forma acessível (não só por cor).

### 4.8 DASH-006: Vencimentos e Alertas
Lista ordenada com descrição, valor, competência, vencimento, status (`previsto | pendente | pago | vencido`) e origem. "Marcar como pago" **redireciona** à operação transacional correta. Alertas do MVP: vencimento próximo, conta vencida, projeção negativa, orçamento excedido, fatura próxima.

### 4.9 Estados obrigatórios em todas as telas
Carregando (skeleton) · vazio (CTA para primeiro lançamento) · erro de rede (tentar novamente) · sem acesso (aviso neutro) · dados parciais (origem identificada) · período sem movimentação · sessão expirada (reautenticar).
**Não exibir dados fictícios como reais.** Sem integração, usar estado vazio ou exemplo explicitamente rotulado.

---

## 5. Regras de negócio críticas (não negociáveis)

1. Dado privado/restrito nunca aparece sem autorização explícita; autorização é aplicada **antes** da agregação (evita vazamento por totais, gráficos e cache).
2. Visão familiar = apenas recursos compartilhados/autorizados. Despesa compartilhada não é somada por integrante (sem duplicidade).
3. Transferências internas não são receita nem despesa de consumo.
4. Compra no cartão compromete o limite; **pagamento da fatura** reduz o saldo bancário e não conta despesa duas vezes.
5. Aportes e resgates são movimentações patrimoniais, não receita/consumo.
6. Limite de crédito **não** é saldo disponível.
7. Realizado e previsto sempre separados.
8. Valor ausente ≠ zero quando o significado é desconhecido.
9. "Ocultar valores" alcança cards, gráficos, listas, tooltips e texto alternativo.
10. Chaves de cache incluem usuário/autorização, família, visão e período.

---

## 6. Fórmulas

**Monetários**
- `SaldoDisponivelContas` = soma dos saldos atuais autorizados (sem limite de crédito)
- `ReceitasRealizadasMes` = receitas recebidas no período (sem transferências e resgates)
- `DespesasRealizadasMes` = despesas de consumo reconhecidas (sem pagamento duplicado de fatura)
- `PatrimonioBruto` = disponibilidades + investimentos + outros ativos elegíveis
- `PatrimonioLiquido` = `PatrimonioBruto` − passivos elegíveis (inclui faturas não quitadas, quando aplicável)
- `saldoProjetadoFinal` = `saldoInicial` + `receitasPrevistas` − `saidasPrevistas` (com ajuste de itens já realizados e sem duplicidade). O saldo final do mês anterior é o saldo inicial do seguinte.

**Percentuais**
- `TaxaPoupanca` = (receitas − despesas) / receitas × 100, quando receitas > 0
- `VariacaoMensalDespesa` = (atual − anterior) / anterior × 100, indisponível se anterior = 0
- `PercentualOrcamentoUtilizado` = despesas elegíveis da categoria / limite × 100, quando limite > 0
- `ComprometimentoReceita` = obrigações previstas / receitas previstas × 100 (rotular como **estimativa**)
- `MesesReservaEmergencia` = reserva classificada / média de despesas essenciais, quando média > 0

Cada indicador declara sua dimensão de data: transação, competência, vencimento ou pagamento.

---

## 7. API e arquitetura

**Rotas** (parâmetros `familia_id` autorizados no backend, nunca confiados ao cliente):

```
GET /painel/resumo?periodo=AAAA-MM&visao=pessoal|familiar
GET /painel/receitas-despesas
GET /painel/categorias
GET /painel/cartoes
GET /painel/patrimonio
GET /painel/projecoes
GET /painel/vencimentos
GET /painel/alertas
```

**Contrato de resposta:** toda resposta inclui `periodoReferencia`, `visao`, `atualizadoEm`, unidade monetária e flag de indisponibilidade.

**DTOs:** `ResumoFinanceiroDto`, `IndicadorFinanceiroDto`, `SerieTemporalDto`, `DistribuicaoCategoriaDto`, `ResumoCartaoDto`, `ProjecaoMensalDto`, `CompromissoFinanceiroDto`.

**Serviços (backend):** `ServicoResumoFinanceiro`, `ServicoIndicadores`, `ServicoProjecoes`, `ServicoAlertas`, `PoliticaAcessoFinanceiro`.
Cálculo e regra de negócio **nunca** em componente React.

**Componentes (frontend):** `MenuLateral`, `CabecalhoFinanceiro`, `SeletorVisaoFinanceira`, `SeletorPeriodo`, `CartaoIndicador`, `GraficoReceitasDespesas`, `GraficoDespesasPorCategoria`, `CartaoFatura`, `ListaVencimentos`, `GraficoEvolucaoPatrimonial`, `CartaoProjecao`, `IndicadorEstado`, `AcaoRapida`, `MascaraValores`, `AlertaFinanceiro`, `EstadoVazio`, `IndicadorCarregamento`.

**Hooks:** `useResumoFinanceiro`, `useReceitasDespesas`, `useCartoesPainel`, `usePatrimonio`, `useProjecoes`, `useVencimentos`, `useAlertas`.

---

## 8. Ordem de implementação

| Etapa | Entrega | Pronto quando |
|---|---|---|
| 1 | `MenuLateral` + `LayoutAutenticado` + rotas privadas | 5 estados, mobile (drawer), teclado, filtro por permissão |
| 2 | `CabecalhoFinanceiro`, `SeletorVisaoFinanceira`, `SeletorPeriodo`, `MascaraValores` | Troca de família/visão invalida cache; ocultar valores funciona em tudo |
| 3 | Backend: `PoliticaAcessoFinanceiro` + `GET /painel/resumo` | Testes de isolamento entre famílias e usuários |
| 4 | DASH-001 com `CartaoIndicador` e gráficos | CA-DASH-001 a 005 |
| 5 | DASH-002 e DASH-006 | CA-DASH-006 a 008, 019 a 021 |
| 6 | DASH-003 e DASH-004 | CA-DASH-009 a 014 |
| 7 | DASH-005 | CA-DASH-015 a 018 |
| 8 | Acessibilidade, desempenho, segurança, revisão final | Definition of Done (seção 10) |

Enquanto os módulos de Contas, Cartões, Planejamento e Investimentos não existirem, usar **estado vazio** ou exemplo explicitamente rotulado, nunca valores fictícios em produção.

---

## 9. Testes

- **Unitários:** fórmulas, elegibilidade de movimentos, competência, variações, projeções, mascaramento.
- **Integração:** consultas agregadas, troca de família, estornos, pagamento de fatura.
- **E2E:** navegação pelas seis telas, desktop e mobile, períodos, modo privacidade, estados vazios, permissão.
- **Segurança:** IDOR/BOLA, inferência por agregados, cache compartilhado indevidamente, sessão expirada, cartões restritos, troca de família por URL.
- **Acessibilidade:** WCAG 2.2 AA, teclado, gráficos com resumo textual, tooltips que não dependam só de hover.

---

## 10. Critérios de aceite e Definition of Done

Critérios: **CA-DASH-001 a CA-DASH-026** (Módulo 03). Em especial:
- CA-DASH-022: navegação padronizada em todas as telas
- CA-DASH-024: nenhuma soma monetária em ponto flutuante
- CA-DASH-026: testes cobrem fórmulas e isolamento entre famílias

**Concluído quando:** telas DASH-001 a 006 implementadas, componentes reutilizáveis, consultas financeiras corretas, políticas de acesso verificadas, testes de cálculo e responsividade aprovados, UI dentro da paleta Cyber Finance.

---

## 11. Observações críticas e decisões pendentes

**Inconsistências encontradas nos documentos (resolver antes de codar):**

1. **Menu × Dashboard:** a imagem do menu não tem item chamado "Dashboard", "Contas/Transações" nem "Cartões". Assumi que **"Minha Vida Financeira" = `/painel`** (DASH-001) e que "Início" é a home pós-login. O roadmap do escopo prevê telas de Transações/Contas e Cartões, que ainda não têm entrada no menu. **Confirmar o mapeamento e incluir os itens faltantes.**
2. **"Metas" no menu:** o escopo do MVP fala em "Orçamentos por categoria" (RF-011), não em "Metas". Definir se é o mesmo módulo ou item fora do MVP.
3. **Origem da imagem:** o menu foi desenhado como "Módulo 02 – Gestão Familiar". O Módulo 03 exige o mesmo componente em todas as telas. Tratar como global, sem cópia por módulo.
4. **Mobile:** o Design System prevê barra inferior (até 639 px) e o desenho do menu prevê drawer. Decidir o padrão (sugestão: barra superior + drawer, e barra inferior só para as 4–5 ações principais).

**Decisões do Módulo 03 ainda abertas:**
- D-DASH-001: despesa de cartão reconhecida pela data da compra ou pela competência da parcela (impacta os gráficos)
- D-DASH-002: quais passivos entram no patrimônio líquido do MVP
- D-DASH-003: metas/orçamento entram no dashboard inicial ou só com o módulo Planejamento
- D-DASH-004: frequência de atualização manual de investimentos
- D-DASH-005: períodos personalizados além do mês civil
- D-DASH-006: horizonte de projeção no mobile
- D-DASH-007: exportação de relatórios (evolução futura)

**Riscos principais:**
- **Vazamento por agregado:** totais e gráficos podem revelar dados privados se a autorização vier depois da soma. Autorizar antes de agregar.
- **Dupla contagem:** cartão/fatura, transferências e aportes são os pontos mais prováveis de erro. Cobrir com testes de fórmula desde o início.
- **Cache:** chave sem usuário/família/visão expõe dados entre contextos.
- **Dashboard sem dados:** sem os módulos de domínio, há risco de entregar telas "bonitas" com números simulados. Manter estado vazio.
