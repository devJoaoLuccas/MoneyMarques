# Money Marques — Módulo 01 | Autenticação

**Especificação funcional e técnica · v1.0 · 15/10/2026**

| Item | Detalhe |
|---|---|
| Status | Versão inicial para validação |
| Produto | Money Marques — Cyber Finance |
| Plataforma | Web responsiva |
| Método | SDD + TDD + Clean Code |

---

## 1. Objetivo e contexto

Descrever o módulo responsável por identidade, criação de conta, login, recuperação de acesso, autenticação multifator e estabelecimento seguro da sessão. O módulo deve preceder qualquer acesso às informações financeiras pessoais ou familiares.

**Documento de referência:** Design System Money Marques v1.0 (paleta cyberpunk: fundo `#0A0A12`, violeta `#7C3AED`, ciano `#22D3EE` e magenta `#FF2DA6`). Os wireframes aprovados orientam a composição visual; tokens e componentes globais não devem ser duplicados aqui.

### 1.1. Público, perfis e premissas

- **Usuários:** integrantes de famílias, administradores familiares e membros com acesso apenas de consulta.
- As permissões financeiras pertencem ao módulo de Gestão Familiar; não decorrem exclusivamente do sucesso do login.
- **Premissas:**
  - autenticação inicial por e-mail e senha;
  - ambiente web responsivo;
  - dados financeiros sensíveis;
  - integração bancária fora do MVP;
  - cadastro de família ocorre após a autenticação.
- Login social e passkeys permanecem fora da versão inicial.

### 1.2. Escopo e inventário de telas

| ID | Tela |
|---|---|
| AUTH-001 | Login |
| AUTH-002 | Cadastro de usuário |
| AUTH-003 | Recuperação/redefinição de senha |
| AUTH-004 | Verificação MFA |
| AUTH-005 | Seleção e estabelecimento de contexto após autenticação (transição para Gestão Familiar) |

**Incluído:** validação de formulário, mensagens de feedback, sessões e logout, proteção de rotas, redirecionamentos e auditoria essencial.

**Não incluído:** gerenciamento de membros, permissões familiares detalhadas, integrações sociais, biometria, OAuth de terceiros e controle de instituições financeiras.

---

## 2. Fluxo geral de navegação

- **Acesso sem sessão:** AUTH-001 Login → autenticação de credenciais → (quando exigido) AUTH-004 MFA → resolução de sessão e contexto → dashboard autorizado ou onboarding de família.
- **Novo usuário:** AUTH-002 Cadastro → confirmação de e-mail, conforme política definida → Login ou sessão de cadastro validada → MFA, se aplicável → criação/ingresso em família.
- **Esqueceu senha:** AUTH-003 Solicitar recuperação → mensagem neutra de confirmação → abrir link válido → definir nova senha → confirmação → Login.
- **Usuário com sessão válida acessando `/login`:** redirecionar ao contexto autorizado.
- **Sessão expirada:** remover informações sensíveis renderizadas e retornar à autenticação.

---

## 3. AUTH-001 — Login

### 3.1. Objetivo e elementos

Permitir acesso seguro por e-mail e senha.

**Componentes:** BrandPanel com assets oficiais, LoginCard, LoginHeader, EmailInput, PasswordInput com mostrar/ocultar, RememberSession, ForgotPasswordLink, LoginButton, RegisterLink, FormAlert e LoadingIndicator.

**Layout:**
- **Desktop:** área de identidade visual ≈ 60% e formulário ≈ 40%; card com largura máxima aproximada de 440 px.
- **Mobile:** uma coluna, logo/símbolo no topo, ilustração reduzida, CTA de largura integral.
- O layout de alta fidelidade aprovado é referência visual, não contrato rígido de pixels.

### 3.2. Campos e validações

| Campo | Regras |
|---|---|
| **E-mail** | Obrigatório; entrada apropriada para e-mail; até 254 caracteres; remoção de espaços nas extremidades; `autocomplete=username`. A política de normalização do identificador é definida pelo backend. |
| **Senha** | Obrigatória; `type=password`; alternância visível/oculta; `autocomplete=current-password`; sem *trim*; sem regras de composição aplicadas no login. Permitir preenchimento automático e colagem. |
| **Manter sessão** | Checkbox desmarcado inicialmente; altera apenas a política de duração da sessão emitida pelo servidor. **Nunca** armazenar senha ou token de longa duração em `localStorage`. |

### 3.3. Interações e estados

**Estados:** inicial; validação client-side; submetendo; credenciais inválidas; resposta de limitação de tentativas; falha de rede; MFA pendente; login concluído; sessão expirada.

- Em envio, bloquear somente envios duplicados e mostrar progresso.
- Erro genérico sugerido: *"Não foi possível entrar. Verifique suas credenciais e tente novamente."*
- Não confirmar nem negar a existência do e-mail.
- Evitar limpar o e-mail após falha.

### 3.4. Critérios de aceite — AUTH-001

| ID | Critério |
|---|---|
| CA-001 | Credenciais válidas iniciam sessão e seguem o fluxo autorizado. |
| CA-002 | Dados inválidos recebem feedback por campo. |
| CA-003 | Senha pode ser mostrada/ocultada sem alteração do valor. |
| CA-004 | Falhas não expõem existência de conta. |
| CA-005 | Há feedback visual e acessível de carregamento, erro e indisponibilidade. |
| CA-006 | Desktop/mobile e teclado funcionam. |
| CA-007 | Sessão expirada não mantém informações financeiras expostas. |

---

## 4. AUTH-002 — Cadastro de usuário

### 4.1. Objetivo e interface

Permitir criar conta individual vinculável a uma ou mais famílias.

**Componentes:** nome completo, e-mail, senha, mostrar/ocultar, confirmação de senha (se adotada), aceite dos termos aplicáveis e link para Login. No mobile, formulário de uma coluna com feedback junto aos campos.

### 4.2. Campos, validações e decisões

| Campo | Regras |
|---|---|
| **Nome** | Obrigatório; 2–120 caracteres sugeridos; remover espaços redundantes sem eliminar caracteres válidos. |
| **E-mail** | Obrigatório; sintaxe válida; até 254 caracteres. |
| **Senha** | Política do servidor; mínimo de 12 caracteres, com letra maiúscula, letra minúscula, número e caractere especial (qualquer símbolo que não seja letra, número ou espaço); suporte a gerenciadores de senha. Se houver confirmação de senha, exigir igualdade. |
| **Consentimentos** | Exibir Termos de Uso e Política de Privacidade por links; separar aceites contratuais de consentimentos opcionais. A necessidade jurídica de checkbox obrigatório deve ser validada antes do lançamento. |

### 4.3. Regras e estados

**Estados:** preenchimento; e-mail inválido; senha não aderente; submetendo; cadastro concluído; verificação de e-mail pendente; erro de rede; solicitação duplicada.

- Evitar mensagens que facilitem enumeração de contas, inclusive em fluxos públicos.
- Após o cadastro, estabelecer o fluxo de confirmação de endereço eletrônico antes de autorizar acesso a dados financeiros, conforme política de segurança.
- Convite familiar válido poderá ser retomado após autenticação.

### 4.4. Critérios de aceite — AUTH-002

| ID | Critério |
|---|---|
| CA-008 | Campos e senha obedecem à política validada no backend. |
| CA-009 | Cadastros duplicados não expõem dados de usuários existentes. |
| CA-010 | Confirmação de e-mail é exigida conforme política. |
| CA-011 | A navegação para Login funciona. |
| CA-012 | A interface é responsiva e acessível. |

---

## 5. AUTH-003 — Recuperação de senha

### 5.1. Solicitação

- Tela solicita apenas o e-mail, com CTA "Enviar instruções" e retorno ao Login.
- Resposta neutra sugerida: *"Se houver uma conta associada a esse e-mail, você receberá instruções para redefinir sua senha."*

### 5.2. Redefinição

- Link com token de uso único, curta validade, não reutilizável e validado no servidor.
- Exigir nova senha (e confirmação, se definida).
- Não expor o token em logs, analytics, URLs de terceiros ou mensagens de erro.

**Ao redefinir:**
1. Invalidar o token.
2. Revogar sessões existentes de acordo com a política de segurança.
3. Notificar o usuário da alteração.
4. Encaminhar ao Login.

**Token expirado ou inválido:** oferecer novo pedido sem revelar detalhes sensíveis.

### 5.3. Critérios de aceite — AUTH-003

| ID | Critério |
|---|---|
| CA-013 | Solicitação não revela existência do e-mail. |
| CA-014 | Token expirado, usado ou inválido é recusado. |
| CA-015 | Nova senha cumpre a política e encerra sessões conforme regra. |
| CA-016 | Fluxo comunica sucesso ou falha de forma acessível. |

---

## 6. AUTH-004 — Autenticação multifator (MFA)

### 6.1. Escopo inicial

- Prever MFA para proteger acesso a finanças sensíveis.
- **Estratégia inicial proposta:** aplicativo autenticador TOTP, códigos de recuperação de uso único e opção de reenrolamento seguro.
- A obrigatoriedade, inclusive para administradores, deve ser decidida antes do go-live.
- Não tratar códigos por e-mail como único fator de alta segurança.
- Não permitir que o MFA seja contornado por rotas alternativas ou por chamadas diretas à API.

### 6.2. Tela e estados

**Campos:** código de verificação, ação de confirmar, opção de código de recuperação e retorno à autenticação quando aplicável.

**Estados:** aguardando código; enviando; inválido; expirado; tentativas limitadas; concluído.

**Segurança:**
- Códigos TOTP precisam de controle de *replay* e janela de validação.
- Segredos devem ser protegidos e nunca expostos após a configuração inicial.
- Códigos de recuperação devem ser gerados e armazenados com proteção adequada.

### 6.3. Critérios de aceite — AUTH-004

| ID | Critério |
|---|---|
| CA-017 | Sessão com MFA pendente não acessa dados privados. |
| CA-018 | Código válido conclui o desafio. |
| CA-019 | Códigos inválidos ou repetidos são recusados com proteção antiabuso. |
| CA-020 | Recuperação de MFA segue procedimento seguro e auditável. |

---

## 7. AUTH-005 — Contexto após autenticação

Uma sessão autenticada não concede acesso indiscriminado aos recursos de uma família. Após concluir todas as verificações:

| Situação | Ação |
|---|---|
| Não há família | Abrir onboarding familiar |
| Somente um contexto autorizado | Ingressar nele |
| Múltiplos contextos | Abrir seleção |
| Convite pendente | Apresentar fluxo de aceite |

O backend deve validar associação e papel em cada requisição e em cada recurso. Seletores de visão pessoal/familiar não constituem mecanismo de autorização.

---

## 8. Regras de negócio compartilhadas

| ID | Regra |
|---|---|
| RN-AUTH-001 | Autenticação feita no backend. |
| RN-AUTH-002 | Erros públicos neutros. |
| RN-AUTH-003 | Não expor credenciais, tokens e códigos em logs. |
| RN-AUTH-004 | Limitar tentativas por múltiplos sinais, observando riscos de bloqueio abusivo. |
| RN-AUTH-005 | Encerrar sessão via revogação no servidor quando aplicável. |
| RN-AUTH-006 | Proteção CSRF para fluxos com cookie, conforme arquitetura. |
| RN-AUTH-007 | Sessão e cookies `HttpOnly`, `Secure` e `SameSite` apropriado, com HTTPS obrigatório. |
| RN-AUTH-008 | Proteção contra fixação de sessão, sessão expirada e acesso direto a rotas privadas. |
| RN-AUTH-009 | Verificar e-mail no cadastro. |
| RN-AUTH-010 | Recuperação de senha por token de uso único. |
| RN-AUTH-011 | MFA não pode ser ignorado quando exigido. |
| RN-AUTH-012 | Toda operação familiar deve validar autorização no servidor. |

---

## 9. Diretrizes de UX, Design System e responsividade

**Identidade**
- Arte oficial do símbolo punk em moeda, logo horizontal e vertical; nunca substituí-las por ícones genéricos.
- BrandPanel com ilustração cyberpunk no desktop; no mobile, cabeçalho compacto e prioridade absoluta ao formulário.

**Design System**
- Tokens e componentes visuais devem referenciar o Design System global; não codificar hexadecimais locais por tela.
- Fontes: Inter nos campos e Space Grotesk em títulos de marca.
- Glow moderado nas ações, contraste WCAG 2.2 AA, foco visível, áreas de toque adequadas e preferência por redução de movimento.

**Breakpoints (conforme Design System)**

| Faixa | Largura |
|---|---|
| Mobile | até 639 px |
| Tablet | 640–1023 px |
| Desktop | 1024–1439 px |
| Desktop amplo | ≥ 1440 px |

O layout deve suportar zoom de 200%, rolagem sem perda de ação e teclado virtual.

---

## 10. Arquitetura técnica sugerida

**Frontend**
- React + TypeScript + React Router
- React Hook Form + Zod (formulários)
- Axios (rede)
- TanStack Query (mutações)
- Organização por feature: `auth/pages`, `auth/components`, `auth/services`, `auth/schemas`, `auth/hooks`

**Backend**
- NestJS com validação de DTOs, sessões e cookies seguros
- Hash de senhas robusto (preferencialmente **Argon2id**)
- Rate limiting, auditoria e MFA de acordo com a política aprovada

**Contratos de API propostos (a refinar)**

| Método | Rota |
|---|---|
| POST | `/auth/login` |
| POST | `/auth/register` |
| POST | `/auth/logout` |
| GET | `/auth/session` |
| POST | `/auth/password/forgot` |
| POST | `/auth/password/reset` |
| POST | `/auth/mfa/verify` |
| POST | `/auth/email/verify` |

Payloads, status HTTP, erros tipados e limites serão definidos após a modelagem de backend.

**Observação:** o fluxo de login pode indicar `auth_required`, `mfa_required` ou `authenticated` sem devolver credenciais sensíveis. Nunca guardar tokens de longa duração em `localStorage`.

---

## 11. Testes e qualidade

| Tipo | Cobertura |
|---|---|
| **Unitários** | Validação dos schemas, estados do formulário e controle de visibilidade da senha. |
| **Integração** | Serviço de autenticação, erros, fluxo MFA e tratamento de sessão. |
| **E2E** | Login correto/incorreto, cadastro, senha esquecida, token inválido, MFA, logout, redirecionamentos, teclado e viewport mobile. |
| **Segurança** | Enumeração de contas, credential stuffing/rate limiting, CSRF, session fixation, revogação de sessão, acesso indevido entre famílias, indisponibilidade de dados privados antes de MFA e vazamento em logs. |

---

## 12. Critérios de entrega (Definition of Done)

O módulo será considerado concluído quando:

- [ ] Os fluxos de AUTH-001 a AUTH-004 estiverem implementados e testados.
- [ ] A transição AUTH-005 estiver funcional.
- [ ] Os tokens e assets oficiais estiverem aplicados.
- [ ] Os requisitos mínimos de acessibilidade forem verificados.
- [ ] As revisões de segurança forem aprovadas.

Todo requisito deve ter teste correspondente, rastreabilidade por identificador AUTH/RN/CA e registro de decisões que alterem regras de autenticação.
