# Money Marques — Módulo 02 | Gestão Familiar
## Guia de Implementação (SDD + TDD + Clean Code)

Base: Especificação Funcional e Técnica v1.0 (15/10/2026). Este guia traduz a especificação em ordem de execução, modelo de dados, contratos, política de autorização e testes. Em caso de conflito, a especificação prevalece.

---

## 1. Resumo executivo

- **Entrega:** criar família, gerenciar integrantes, convites, permissões/privacidade e configurações (FAM-001 a FAM-006).
- **Núcleo de risco:** autorização server-side (RBAC + ACL por recurso). Todo o resto depende dela. Implementar e testar **primeiro**.
- **Stack:** NestJS + PostgreSQL (backend); React + TypeScript, React Router, TanStack Query, Axios, React Hook Form + Zod (frontend).
- **Dependências:** Módulo 01 (sessão/identidade) obrigatório antes; Módulos 03 e 04 consomem o contexto familiar.
- **Atenção:** o escopo cita "divisão automática de despesas" (item 1.1), mas nenhuma regra, tela ou critério de aceite a detalha. Tratar como **fora desta entrega** até haver especificação (ver seção 10).

---

## 2. Ordem de implementação

| Fase | Entrega | Telas/Regras | Pré-requisito |
|---|---|---|---|
| 0 | Fundação: migrations, entidades, guard de contexto familiar, auditoria | RN-FAM-006, 010, 013 | Módulo 01 |
| 1 | Motor de autorização (policy service) | Seção 3 da spec, RN-FAM-004 | Fase 0 |
| 2 | Criação de família (atômica) + listagem | FAM-001, RN-FAM-001/002/005 | Fase 1 |
| 3 | Integrantes + regras de proteção do último admin | FAM-003, RN-FAM-005/009/014/016 | Fase 2 |
| 4 | Convites (emissão, aceite, recusa, revogação) | FAM-005, RN-FAM-007/008 | Fase 3 |
| 5 | Visão geral | FAM-002 | Fases 2–4 |
| 6 | Permissões e privacidade (modelo + tela representando a política) | FAM-004, RN-FAM-003/017 | Fase 1 |
| 7 | Configurações + transferência de administração | FAM-006 | Fase 3 |
| 8 | Troca de contexto familiar + invalidação de cache | Fluxo E, RN-FAM-012 | Fase 2 |
| 9 | Testes de segurança, a11y, hardening, DoD | Seção 14 da spec | Todas |

Wireframes (desktop + mobile, com estados de erro/vazio/sucesso) devem estar aprovados antes das fases de UI correspondentes.

---

## 3. Modelo de dados (PostgreSQL, snake_case)

```sql
-- Enums
CREATE TYPE papel_familia AS ENUM ('ADMINISTRADOR', 'INTEGRANTE', 'VISUALIZADOR');
CREATE TYPE situacao_integrante AS ENUM ('ATIVO', 'REVOGADO', 'REMOVIDO');
CREATE TYPE situacao_convite AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO', 'EXPIRADO', 'REVOGADO');
CREATE TYPE visibilidade_recurso AS ENUM ('PRIVADO', 'COMPARTILHADO', 'RESTRITO');

CREATE TABLE familia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          varchar(40)  NOT NULL CHECK (char_length(nome) BETWEEN 3 AND 40),
  descricao     varchar(240),
  avatar        text,                       -- ícone predefinido no MVP (D-FAM-008)
  configuracoes jsonb NOT NULL DEFAULT '{}',
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE integrante_familia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id    uuid NOT NULL REFERENCES familia(id),
  usuario_id    uuid NOT NULL REFERENCES usuario(id),
  papel         papel_familia NOT NULL,
  situacao      situacao_integrante NOT NULL DEFAULT 'ATIVO',
  ingressou_em  timestamptz NOT NULL DEFAULT now(),
  removido_em   timestamptz
);
-- RN-FAM-006: um vínculo ativo por usuário/família
CREATE UNIQUE INDEX ux_integrante_ativo
  ON integrante_familia (familia_id, usuario_id) WHERE situacao = 'ATIVO';
CREATE INDEX ix_integrante_usuario ON integrante_familia (usuario_id);

CREATE TABLE convite_familia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id    uuid NOT NULL REFERENCES familia(id),
  email         varchar(254) NOT NULL,       -- normalizado (lowercase, trim)
  papel         papel_familia NOT NULL DEFAULT 'INTEGRANTE',
  hash_token    char(64) NOT NULL UNIQUE,    -- SHA-256 do token; token em claro nunca é persistido
  expira_em     timestamptz NOT NULL,
  situacao      situacao_convite NOT NULL DEFAULT 'PENDENTE',
  convidado_por uuid NOT NULL REFERENCES usuario(id),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  respondido_em timestamptz
);
-- Um convite pendente por e-mail/família
CREATE UNIQUE INDEX ux_convite_pendente
  ON convite_familia (familia_id, lower(email)) WHERE situacao = 'PENDENTE';

CREATE TABLE permissao_recurso_familia (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id      uuid NOT NULL REFERENCES familia(id),
  tipo_recurso    varchar(40) NOT NULL,      -- conta | cartao | investimento | orcamento ...
  recurso_id      uuid NOT NULL,
  destinatario_id uuid NOT NULL REFERENCES usuario(id),
  pode_visualizar boolean NOT NULL DEFAULT false,
  pode_criar      boolean NOT NULL DEFAULT false,
  pode_editar     boolean NOT NULL DEFAULT false,
  pode_excluir    boolean NOT NULL DEFAULT false,
  concedido_por   uuid NOT NULL REFERENCES usuario(id),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (familia_id, tipo_recurso, recurso_id, destinatario_id)
);

CREATE TABLE evento_auditoria_familia (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id         uuid NOT NULL REFERENCES familia(id),
  responsavel_id     uuid NOT NULL REFERENCES usuario(id),
  acao               varchar(60) NOT NULL,
  alvo_id            uuid,
  metadados_seguros  jsonb NOT NULL DEFAULT '{}',  -- NUNCA tokens, e-mails completos ou valores financeiros
  ocorrido_em        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_auditoria_familia ON evento_auditoria_familia (familia_id, ocorrido_em DESC);
```

Decisões de modelo:
- Remoção de integrante é **lógica** (`situacao`), preservando histórico (RN-FAM-014).
- "Pelo menos um administrador ativo" **não** é expressável por constraint simples. Garantir no serviço com transação + `SELECT ... FOR UPDATE` sobre os vínculos administradores da família (RN-FAM-005/016).
- A coluna de visibilidade (`visibilidade_recurso`) pertence à tabela de cada recurso financeiro (Módulo 04). Este módulo fornece o enum e o serviço de política.

---

## 4. Motor de autorização (fase crítica)

Decisão = função pura e testável: `can(usuario, acao, recurso) → allow | deny`.

Entradas: usuário da sessão, `familia_id` ativa, vínculo ativo, papel, proprietário do recurso, visibilidade, concessões em `permissao_recurso_familia`.

Regras de precedência (primeira que casar encerra):
1. Sem sessão válida/MFA concluído → **deny**.
2. Sem vínculo `ATIVO` na família → **deny** (resposta sem revelar existência da família).
3. Ação administrativa de família (editar, convidar, papéis, remover) → exige `ADMINISTRADOR`.
4. Recurso `PRIVADO` → somente o proprietário (administrador **não** tem acesso — RN-FAM-004).
5. Recurso `RESTRITO` → somente proprietário + destinatários listados.
6. Recurso `COMPARTILHADO` → membros elegíveis; edição só com `pode_editar` explícito.
7. `VISUALIZADOR` → nunca cria/edita/exclui (RN-FAM-015).
8. Padrão → **deny**.

Implementação NestJS:
- `FamiliaContextGuard`: resolve `familia_id` (header/rota), valida vínculo ativo **a cada requisição** (RN-FAM-010). O ID vindo do cliente nunca é prova de autorização.
- `PapelGuard` + decorator `@RequerPapel('ADMINISTRADOR')` para ações de família.
- `PoliticaAcessoService` para recursos (usado também por agregados/relatórios — RN-FAM-011). Expor uma função de **filtro de query** (não só checagem pontual) para que listagens e somas nunca incluam dados privados.
- Sem cache de decisão entre requisições (revogação imediata — RN-FAM-009, CA-FAM-017).

---

## 5. Contratos de API

Todos resolvem o usuário pela sessão. Erros tipados, sem vazar dados de famílias não autorizadas (404 em vez de 403 quando existir risco de enumeração).

| Método | Rota | Papel | Fase |
|---|---|---|---|
| POST | `/familias` | autenticado | 2 |
| GET | `/familias` | autenticado (somente as suas) | 2 |
| GET | `/familias/:id` | membro ativo | 5 |
| PATCH | `/familias/:id` | ADMIN | 7 |
| GET | `/familias/:id/integrantes` | membro ativo (paginado, filtros nome/papel/status) | 3 |
| PATCH | `/familias/:id/integrantes/:integranteId` | ADMIN (papel) | 3 |
| DELETE | `/familias/:id/integrantes/:integranteId` | ADMIN (remoção lógica) | 3 |
| POST | `/familias/:id/convites` | ADMIN | 4 |
| GET | `/familias/:id/convites` | ADMIN (paginado) | 4 |
| POST | `/familias/:id/convites/:conviteId/revogar` | ADMIN | 4 |
| POST | `/convites/:token/aceitar` | autenticado, e-mail igual ao do convite | 4 |
| POST | `/convites/:token/recusar` | autenticado | 4 |

Endpoints ausentes na especificação e necessários (propor e validar):
- `POST /familias/:id/sair` (saída do próprio integrante — CA-FAM-025).
- `POST /familias/:id/transferir-administracao` (FAM-006).
- `POST /familias/:id/convites/:conviteId/reenviar` (gera novo token, invalida o anterior).
- Endpoints de concessão de permissão: definir junto ao Módulo 04 (spec, 12.2).

---

## 6. Regras de negócio — checklist de implementação

**Criação (FAM-001)**
- [ ] Transação única: `INSERT familia` + `INSERT integrante_familia (ADMINISTRADOR)`; qualquer falha reverte tudo (CA-FAM-003).
- [ ] Validação: nome 3–40, descrição ≤ 240, normalização de espaços; mesma validação no Zod (front) e DTO (back).
- [ ] Nenhuma conta privada é compartilhada automaticamente (CA-FAM-005).

**Integrantes (FAM-003)**
- [ ] Não remover nem rebaixar o último administrador (CA-FAM-010), com lock transacional.
- [ ] Remoção revoga acesso imediatamente e preserva histórico/auditoria (CA-FAM-011/012).
- [ ] Operações idempotentes ou protegidas contra concorrência.
- [ ] E-mail mascarado quando apropriado (D-FAM-007 pendente).

**Convites (FAM-005)**
- [ ] Token: 32 bytes aleatórios (CSPRNG), enviado em claro apenas no link; persistir somente o hash.
- [ ] Validade padrão 7 dias (configurável); job/consulta marca `EXPIRADO`.
- [ ] Aceite valida: token, estado `PENDENTE`, expiração e **e-mail do usuário autenticado == e-mail do convite** (CA-FAM-018).
- [ ] Aceite idempotente; o índice único parcial impede vínculo duplicado (CA-FAM-020).
- [ ] Reenvio invalida o token anterior.
- [ ] Rate limit na emissão; resposta neutra para evitar enumeração de contas.
- [ ] Preview do convite sem dados financeiros (CA-FAM-022). Envio de e-mail assíncrono (fila); criação do convite não depende da entrega.

**Permissões (FAM-004)**
- [ ] Recurso pessoal novo nasce `PRIVADO` (RN-FAM-003, CA-FAM-013).
- [ ] Permissões separadas: visualizar / criar / editar / excluir; leitura não implica edição.
- [ ] Mudança de visibilidade exige confirmação explícita do titular (RN-FAM-017) e gera auditoria.
- [ ] Agregados respeitam o mesmo filtro (CA-FAM-015).
- [ ] Até existirem recursos financeiros, a tela representa a política **sem simular dados sensíveis**.

**Configurações (FAM-006)**
- [ ] Apenas admin edita (CA-FAM-023); nome propaga para navegação.
- [ ] Transferência de administração atômica, sem race entre admins (RN-FAM-016).
- [ ] Saída do último admin exige transferência prévia (CA-FAM-025).
- [ ] Encerramento da família: **fora do primeiro corte**.

**Transversais**
- [ ] Auditoria em: criação, alteração de papel/permissão/visibilidade, convite emitido/revogado/aceito/recusado, remoção, transferência (RN-FAM-013, CA-FAM-026).
- [ ] Logs sem tokens de convite, sem e-mails completos, sem valores financeiros.
- [ ] CSRF conforme estratégia de sessão do Módulo 01.

---

## 7. Frontend

Estrutura:

```
src/features/familia/
  paginas/        PaginaCriarFamilia, PaginaVisaoGeralFamilia, PaginaIntegrantes,
                  PaginaPermissoes, PaginaConvites, PaginaConfiguracoesFamilia
  componentes/    SeletorDeFamilia, CardIntegrante, TabelaIntegrantes, FormularioConvite,
                  BadgeVisibilidade, DialogoConfirmacao, EstadoVazio
  esquemas/       familia.schema.ts, convite.schema.ts (Zod)
  servicos/       familia.service.ts (Axios)
  hooks/          useFamilias, useIntegrantes, useConvites, useFamiliaAtiva
  tipos/
```

Pontos de atenção:
- **Contexto ativo:** `familiaAtivaId` em estado de aplicação (não em localStorage de longa duração). Ao trocar, `queryClient.removeQueries` para as chaves do contexto anterior (RN-FAM-012). Chaves de query sempre prefixadas por `familiaId`.
- **Ações administrativas:** ocultar na UI para não admins (CA-FAM-007), mas a UI **não é** mecanismo de autorização.
- **Mobile:** lista de integrantes em cards; formulários em tela cheia ou sheet; CTA de largura total; áreas de toque ≥ 44×44 px.
- **Confirmações:** diálogo obrigatório para remover integrante, alterar papel, revogar convite e mudar visibilidade.
- **Estados por tela:** carregando, vazio, erro de rede, sucesso (conforme seções 4–9 da spec).
- **Tokens do Design System:** usar tokens globais; sem hexadecimais locais. Logo/assets oficiais apenas (não criar novas logos).
- **Acessibilidade:** WCAG 2.2 AA, foco visível, labels, mensagens de erro descritivas, navegação por teclado.

---

## 8. Estratégia de testes (TDD)

Escrever o teste antes da regra, nesta prioridade:

**Unitários**
- Política de acesso: matriz completa papel × visibilidade × ação (tabela de casos parametrizada).
- Schemas Zod/DTOs (limites de nome, descrição, e-mail).
- Máquina de estados do convite (PENDENTE → ACEITO/RECUSADO/EXPIRADO/REVOGADO; transições inválidas rejeitadas).

**Integração (banco real)**
- Criação atômica (forçar falha no segundo INSERT → nada persiste).
- Aceite concorrente do mesmo convite (um vínculo só).
- Dois admins tentando se rebaixar/remover simultaneamente (sempre sobra ≥ 1).
- Revogação com sessão ativa → próxima requisição negada.
- Usuário em múltiplas famílias sem vazamento entre contextos.

**E2E (desktop + mobile)**
- Onboarding → criar família → convidar → aceitar → ver membro.
- Alterar papel, remover, transferir administração, sair.
- Troca de família sem dados residuais na tela.

**Segurança (obrigatórios, spec seção 14)**
- IDOR/BOLA em todos os endpoints com `:id`.
- Acesso a recurso privado via endpoint agregado.
- Troca de família por URL/header manipulado.
- Permissão revogada com cache populado.
- Reuso de token de convite; convite aceito por e-mail diferente.
- Escalação de privilégio (INTEGRANTE chamando rotas de ADMIN).

Cobertura: cada critério CA-FAM-001 a 026 e cada RN-FAM-001 a 017 deve ter ao menos um teste rastreável por ID (ex.: `it('CA-FAM-010: ...')`).

---

## 9. Definition of Done

- [ ] CA-FAM-001 a CA-FAM-026 cobertos por testes automatizados
- [ ] RN-FAM-001 a RN-FAM-017 rastreadas a testes
- [ ] Testes de segurança da seção 8 passando
- [ ] UI alinhada ao Design System, responsiva e acessível (WCAG 2.2 AA verificado)
- [ ] Auditoria verificada para todas as ações listadas
- [ ] Revisão de segurança aprovada
- [ ] Documentação técnica e registro de decisões (D-FAM-xxx) atualizados

---

## 10. Decisões pendentes — proposta de padrão para destravar a implementação

Sem resposta do responsável pelo produto, adotar o padrão abaixo e registrar como decisão provisória.

| ID | Questão | Padrão proposto | Impacto se mudar |
|---|---|---|---|
| D-FAM-001 | Quem pode convidar quais papéis | Admin convida os 3 papéis; padrão INTEGRANTE | Baixo (validação no DTO) |
| D-FAM-002 | Prazo/reenvio de convite | 7 dias; reenvio invalida token anterior | Baixo |
| D-FAM-003 | Família com 1 membro | Permitida indefinidamente | Nenhum |
| D-FAM-004 | Múltiplos admins | Permitidos; promoção exige confirmação | Médio (regras de último admin) |
| D-FAM-005 | Edição em recursos compartilhados | Só com `pode_editar` explícito; padrão leitura | Alto (afeta Módulo 04) |
| D-FAM-006 | Titularidade ao sair | Recursos privados permanecem com o usuário; compartilhados exigem destino definido antes da remoção | Alto — **bloqueia FAM-003 completo** |
| D-FAM-007 | Exposição de e-mail | Mascarado para não admins; completo só para admin | Baixo |
| D-FAM-008 | Avatar | Apenas ícones predefinidos no MVP | Baixo (evita upload/validação) |
| (nova) | Divisão automática de despesas | **Fora desta entrega**; exige especificação própria | Alto |

---

## 11. Riscos e pontos críticos

1. **Vazamento por agregados/relatórios.** É o erro mais provável: checagem correta em endpoints unitários e esquecida em somas, dashboards e exports. Mitigação: filtro de autorização centralizado, obrigatório em toda query de recurso financeiro, com teste dedicado.
2. **Race condition do último administrador.** Exige lock transacional; teste de concorrência real, não apenas mock.
3. **Cache de contexto.** Dados da família anterior ou permissões revogadas persistindo no front. Chaves prefixadas por `familiaId` e invalidação na troca.
4. **Enumeração via convites/erros.** Respostas e tempos de resposta devem ser equivalentes para e-mail existente e inexistente.
5. **D-FAM-006 não resolvida.** Remover membro sem política de titularidade pode deixar recursos órfãos ou expor dados. Resolver antes de liberar remoção em produção.
6. **LGPD.** Remoção lógica preserva dados pessoais; a política de retenção/exclusão precisa estar definida antes do go-live. Validar com assessoria jurídica; não é possível confirmar a adequação legal apenas pela especificação.
7. **Dependência de infraestrutura de e-mail.** Se a fila/notificações não existirem, entregar convite com link copiável pelo admin como contingência (mantendo token com hash e expiração).
8. **Acoplamento com Módulo 04.** O modelo de permissão por recurso só é plenamente testável com recursos reais; antes disso, usar um recurso fictício de teste (fixture), nunca dados simulados na UI de produção.
