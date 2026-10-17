# Módulo 03 — Dashboard Financeiro · Decisões e rastreabilidade

> Referências: RF-010, RF-015 (alertas do MVP) · DASH-001 a DASH-006 · CA-DASH-001 a 026.
> Escopo entregue: menu lateral, layout autenticado, cabeçalho global e as seis telas, com API de consulta.
> O painel **só consulta**: não cria saldos próprios nem altera dados.

## 1. Decisões confirmadas com o responsável

| Tema | Decisão |
|---|---|
| Estrutura de pastas | Mantida a arquitetura existente (`modules/`, `shared/`); nomes de componentes e hooks em português, como no documento. |
| Rotas do menu | Início = `/app`. "Minha Vida Financeira" vira grupo com as 6 telas (`/painel/*`). Módulos inexistentes aparecem desabilitados com selo "Em breve". |
| Mobile | Abaixo de 1024 px: barra superior + drawer (sem barra inferior). |
| D-DASH-001 | Despesa de cartão reconhecida pela **competência da parcela**. O pagamento da fatura não é despesa. |
| D-DASH-002 | Passivos do patrimônio líquido = **faturas não quitadas** (abertas, fechadas, parcialmente pagas). |
| D-DASH-004 / 006 | Sem prazo de desatualização de investimentos (só exibimos a data da última atualização manual). Mobile usa os mesmos 12 meses de horizonte. |

## 2. Decisões da implementação (a validar)

| Tema | Decisão | Motivo |
|---|---|---|
| Rotas da API | `GET /familias/:familiaUid/painel/{resumo,receitas-despesas,cartoes,patrimonio,projecoes,vencimentos,alertas}` | Reusa o `FamilyContextGuard` (vínculo ativo validado a cada requisição; 404 a quem não é integrante). Sem `/painel/categorias`: a distribuição vem em `resumo` e `receitas-despesas`. |
| Autorização antes de agregar | `PoliticaAcessoFinanceiro.carregarContexto` resolve contas, cartões e posições visíveis; só o que passa entra em soma, gráfico ou cache. Reusa `decideResourceAccess`. | Regra 1 (sem vazamento por agregado). |
| Visão pessoal x familiar | Pessoal: recursos do titular e lançamentos `PESSOAL` do titular. Familiar: só recursos não privados e autorizados e lançamentos `FAMILIAR` com visibilidade `COMPARTILHADO`. Recurso privado do próprio usuário **fica fora** da visão familiar. | Sem duplicidade entre as visões. |
| Lançamento `RESTRITO` | Fora da visão familiar. | A ACL é concedida sobre contas/cartões/orçamentos, não sobre lançamentos. |
| Categoria privada de outro integrante | Aparece como "Outras categorias" nos agregados. | O nome não pode vazar por total. |
| Valor da fatura | `parcelas de compras ATIVAS + DEBITO − CREDITO − ESTORNO`; saldo devedor = valor − pagamentos confirmados (mínimo 0). | O schema não detalha o sinal dos ajustes; adotado o sentido natural de cada tipo. |
| Limite utilizado | Parcelas de compras ativas em faturas não pagas (sem ajustes). Disponível = limite − utilizado. | Comentário do schema. Limite de crédito não é saldo. |
| Compra de cartão no orçamento | `escopoOrcamento` da compra decide a visão; cartão deve estar visível. | Evita contar a mesma compra no pessoal e no familiar. |
| Saldo projetado / projeção | Saldo atual + receitas em aberto − despesas em aberto − saldo devedor de faturas com vencimento até o fim do mês. Atrasados caem no primeiro mês. Só mês atual e futuros. | Regra 7 (previsto ≠ realizado). |
| Recorrências | Não geram previsão por conta própria: a projeção usa só lançamentos já registrados (rótulo na tela). | Nada inventado; o job de recorrência é de outro módulo. |
| Alertas | Calculados na consulta (vencimento ≤ 3 dias, conta vencida, fatura ≤ 5 dias, projeção negativa nos próximos 3 meses, orçamento excedido). Respeitam `preferencia_alerta`. Nada é persistido nem enviado. | Notificação/envio é do módulo de alertas. |
| Orçamento familiar | Visível só ao titular ou com concessão ativa `ORCAMENTO`. | ACL do modelo. |
| Evolução patrimonial | Evolução dos **ativos** (contas + último valor registrado de cada posição). Passivos não têm histórico. | Honestidade: não reconstruímos o que não foi registrado. |
| "Marcar como pago" | Não existe no painel; a tela orienta usar a operação transacional. | Os módulos de lançamentos e faturas ainda não existem. |
| Origem pessoal/compartilhada | Resolvida pelo seletor de visão, sem filtro extra. | Evita dois controles com o mesmo efeito. |
| Cabeçalho | Visão e período só nas telas `/painel*`. | Nas demais telas não teriam efeito. |
| Cache | Chave do TanStack Query = família + usuário + visão + período + recurso (+ categoria); trocar de família ou de visão remove o contexto anterior. API responde `Cache-Control: no-store`. | Regra 10. |
| Gráficos | Recharts; escala visual converte centavos em `number`, mas todo texto, tooltip e tabela usam a string em centavos. Com "ocultar valores" o gráfico dá lugar a um aviso. Tabela de apoio em cada gráfico. | CA-DASH-024; regra 9; WCAG. |

## 3. Lacunas que continuam abertas

- **D-DASH-003 / 005 / 007:** metas/orçamento no painel inicial, períodos personalizados e exportação seguem fora.
- **Auditoria de leituras sensíveis:** só os acessos negados ficam registrados (pelo guard). Registrar leituras do painel depende de definição do que é "sensível".
- **Limite de requisições (rate limit)** nas consultas agregadas: ainda não aplicado.
- **Desempenho:** séries de 6 meses são montadas em memória a partir das liquidações do intervalo. Medir antes de introduzir cache/Redis ou agregação no banco.
- **Notificações (sino) e perfil:** sem módulo; o sino está desabilitado e o menu traz "Sair" no lugar da engrenagem.
- **Itens do menu sem módulo:** Planejamento, Metas, Investimentos, Relatórios; Gestão Familiar > Visão Geral, Permissões, Configurações.

## 4. Regras → testes

| Regra | Onde é verificado |
|---|---|
| Fórmulas em BigInt (sem float), taxa, variação, participação | `painel/domain/indicadores.spec.ts` |
| Mês civil em America/Bahia, datas civis | `painel/domain/periodo.spec.ts`; `dashboard/filtros/periodo.test.ts` |
| Autorização antes de agregar (privado, restrito, concessão) | `painel/domain/recursos-visiveis.spec.ts`; `test/painel.e2e-spec.ts` |
| Fatura: valor, saldo devedor, status | `painel/domain/fatura.spec.ts` |
| Projeção mensal encadeada e fluxo diário | `painel/domain/projecao.spec.ts`; `test/painel-telas.e2e-spec.ts` |
| Isolamento entre usuários, integrantes e famílias | `test/painel.e2e-spec.ts`, `test/painel-telas.e2e-spec.ts` |
| Cartão sem dupla contagem; competência da parcela | `test/painel-telas.e2e-spec.ts` |
| Menu: estados, teclado, `aria-*`, filtro por papel | `shared/layouts/MenuLateral/MenuLateral.test.tsx`, `menuConfig.test.ts` |
| Telas: estados, privacidade, URL não confiada | `dashboard/pages/VisaoGeralFinanceiraPage.test.tsx`, `TelasPainel.test.tsx` |
| Máscara de valores e ausência ≠ zero | `shared/ui/MascaraValores/MascaraValores.test.tsx` |
