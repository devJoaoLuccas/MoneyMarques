# Módulo 02 — Gestão Familiar · Decisões e rastreabilidade (fases 0 a 4)

> Complementa `modulo-02-gestao-familiar-implementacao.md`. Referências: RF-001, RF-002, RF-013 · FAM-001, FAM-003, FAM-005.
> Escopo entregue: fundação e autorização (fases 0–1), criação e listagem de famílias (2), integrantes (3) e convites (4).
> Fora desta entrega: visão geral completa (5), permissões/visibilidade na UI (6), configurações e transferência de administração (7), troca de contexto com invalidação de cache (8), hardening final (9).

## 1. Decisões tomadas (confirmadas com o responsável)

| Tema | Decisão |
|---|---|
| Índice do vínculo | A unique total `(familia_uid, usuario_uid)` foi trocada por **índice único parcial** `WHERE situacao = 'ATIVO'` (migration `20261018120000_integrante_vinculo_ativo_unico`), permitindo reingresso após remoção lógica. |
| Situação do integrante | Mantido o enum existente `ATIVO/SUSPENSO/REMOVIDO`. Remoção lógica = `REMOVIDO` (+ `removidoEm`). `SUSPENSO` não é usado neste módulo. |
| Entrega do convite | E-mail direto pelo `MailPort` (template HTML base), sem fila; falha de envio não derruba a criação do convite. **Não há link copiável**: o token em claro só existe no e-mail. |

## 2. Decisões da implementação (a validar)

| Tema | Decisão | Motivo |
|---|---|---|
| Token do convite fora da URL | Rotas por **corpo** (`POST /convites/previa|aceitar|recusar { token }`) em vez de `/convites/:token/...` do guia | A auditoria grava `rotaHttp`; token no caminho iria para logs/auditoria (RN-AUTH-003 / D-seg do módulo 01). |
| Aceite pela lista da sessão | `POST /convites/pendentes/:conviteUid/aceitar|recusar` | A sessão só conhece o `uid` dos convites pendentes (AUTH-005). Exige o mesmo e-mail do convite; erro neutro. |
| Hash do token | HMAC com pepper (`TokenService`), em `convite_familia.token_hash` | Reuso do que já existe; não foi criado SHA-256 separado. |
| Convite para quem já é membro | `409 ALREADY_MEMBER` | O administrador já vê os integrantes; para não membros a resposta é idêntica exista conta ou não. |
| Promoção a administrador | Exige `confirmarPromocao: true` no corpo (D-FAM-004) | Confirmação explícita; a UI mostra diálogo antes. |
| Avatar | Identificador de ícone predefinido gravado em `familia.avatar_url` (D-FAM-008) | Sem upload no MVP; sem nova coluna. |
| Validade do convite | 7 dias (`FAMILY_INVITE_TTL_DAYS`) (D-FAM-002) | Padrão proposto no guia. |
| Expiração | Marcada de forma lazy (`EXPIRADO`) em listagem, emissão, previa e aceite | Sem job; estado consistente quando consultado. |
| E-mail de integrante | Completo para ADMINISTRADOR, mascarado (`a***@dominio`) para os demais (D-FAM-007) | Padrão proposto no guia. |
| Limites de emissão | 20 convites/h por admin, 50/dia por família, 20 respostas/15 min por usuário | Sem especificação; valores iniciais conservadores. |

## 3. Lacunas que continuam abertas

- **D-FAM-006 (titularidade ao remover/sair):** ainda não há recursos financeiros (Módulo 04). A remoção apenas encerra o vínculo; **definir a política antes de liberar a remoção em produção**.
- **Filtro de query da política de acesso** (RN-FAM-011): `decideResourceAccess` é função pura e testada, mas o filtro de listagens/agregados depende das colunas dos recursos do Módulo 04.
- **Divisão automática de despesas:** fora do escopo (sem especificação).
- **LGPD / retenção** de vínculos removidos: depende de validação jurídica.

## 4. Regras → testes

| Regra | Onde é verificado |
|---|---|
| RN-FAM-001/002, CA-FAM-003 (criação atômica) | e2e `family` (criação, rollback forçado) |
| FAM-001 (validação nome/descrição/avatar) | e2e `family`, `family.schemas.test`, `CreateFamilyForm.test` |
| RN-FAM-004/015 (matriz papel × visibilidade × ação) | `access-policy.spec` |
| RN-FAM-010 (vínculo validado a cada requisição), IDOR/BOLA | e2e `family` (404 para não integrante em todos os endpoints, UID inválido, auditoria de negado) |
| CA-FAM-007 + escalação de privilégio | e2e `family` (INTEGRANTE/VISUALIZADOR → 403), `MembersPanel.test` |
| CA-FAM-010, RN-FAM-005/016 (último administrador) | e2e `family` (último admin, dois admins concorrentes), `MembersPanel.test` |
| CA-FAM-011/012/017, RN-FAM-014 (remoção lógica, acesso revogado, histórico) | e2e `family` (sessão ativa perde acesso na próxima requisição; histórico preservado; reingresso) |
| D-FAM-007 (e-mail mascarado) | `mask-email.spec`, e2e `family` (listagem) |
| RN-FAM-007 (token só em hash, CSPRNG) | e2e `family` (token não persistido nem retornado) |
| RN-FAM-008 (expiração, revogação, reenvio) e máquina de estados | `invite-state.spec`, e2e `family` |
| CA-FAM-018 (e-mail diferente), reuso de token | e2e `family` (resposta idêntica a token inexistente) |
| CA-FAM-020 (aceite concorrente) | e2e `family` (3 aceites paralelos → 1 vínculo) |
| CA-FAM-022 (previa sem dados financeiros) | e2e `family`, `InviteLinkPanel.test` |
| Resposta neutra / sem enumeração de contas | e2e `family` (convite para e-mail com e sem conta) |
| RN-FAM-013 (auditoria) | e2e `family` (criar, papel, remover, convite emitir/revogar/aceitar, acesso negado) |
| Feedback de carregar/vazio/erro/sucesso, confirmações | `MembersPanel.test`, `SentInvitesPanel.test`, `PendingInvitesList.test`, `ConfirmDialog.test` |

## 5. Código de convite (D-FAM-009) · decisões confirmadas com o responsável

Alternativa ao convite por e-mail para facilitar a entrada (pessoa recebe o código por qualquer meio). Rotas: `POST /familias/:familiaUid/codigos-convite` (+ `GET`, `POST .../:codigoUid/revogar`) para administradores e `POST /convites/codigo/{previa,entrar}` para quem digita. Migration `20261019120000_codigo_convite_familia`.

| Tema | Decisão |
|---|---|
| Uso | **Único**: o código é consumido por quem entra (transação com `FOR UPDATE`; uso concorrente gera um só vínculo). |
| Validade | **24 horas**. |
| Papel | Escolhido na geração (**Integrante** ou **Visualizador**), nunca Administrador (validado no DTO e por CHECK no banco). Entra direto, sem aprovação. |
| Formato | 8 caracteres de um alfabeto de 31 símbolos sem ambiguidade (`XXXX-XXXX`, ~39 bits). Digitação tolera minúsculas, espaços e hífen. |
| Armazenamento | Só o HMAC do código. O código em claro aparece **uma única vez**, na resposta da geração; a lista nunca o devolve. |
| Proteção | 5 tentativas **erradas** por usuário a cada 15 min (vale também para a prévia, que não serve de oráculo). Código malformado, inexistente, expirado, usado ou revogado dá a mesma resposta (`INVALID_INVITE_CODE`). |
| Auditoria | `codigo_convite.emitir`, `.revogar`, `.usar` e `.tentativa` (falha), sem gravar o código digitado. |
| Quem já é integrante | Não consome o código. |
| Fluxo na tela | Prévia (nome da família, quem convidou, papel, validade) e só então "Entrar na família". A tela de primeiro acesso passou a oferecer **criar ou entrar**. |

Lacunas: limite por IP (hoje só por usuário); notificação ao administrador quando o código é usado; limite de códigos ativos por família.
