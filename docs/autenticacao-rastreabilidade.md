# Módulo 01 — Autenticação · Rastreabilidade e decisões

> Complementa `autenticacao.md` (v1.0). Referências: RF-013, RF-014 · AUTH-001 a AUTH-005.
> Convenção: backend `test/*.e2e-spec.ts` = e2e contra PostgreSQL real; `src/**/*.spec.ts` = unitário; frontend `*.test.ts(x)` = Vitest + Testing Library; **Navegador** = fluxo real com Playwright (Chromium) contra backend + Vite.

## 1. Critérios de aceite → testes

| CA | Critério | Onde é verificado |
|---|---|---|
| CA-001 | Credenciais válidas iniciam sessão | e2e `auth-login` (login), `LoginForm.test`, Navegador |
| CA-002 | Feedback por campo | `auth.schemas.test`, `LoginForm.test`, e2e `auth-login` (erro por campo) |
| CA-003 | Mostrar/ocultar senha sem alterar valor | `PasswordField.test` |
| CA-004 | Falhas não expõem existência de conta | e2e `auth-login` (senha errada x e-mail inexistente idênticos), `LoginForm.test`, Navegador |
| CA-005 | Feedback de carregamento, erro e indisponibilidade | `LoginForm.test` (429, rede, duplo envio), `Button.test`, `SessionGate` em `guards.test` |
| CA-006 | Desktop/mobile/teclado | Navegador (1440 px e 390 px, sem rolagem horizontal, alvos ≥ 44 px); componentes com label/foco em `*.test`. **Parcial**: sem teste automatizado de ordem de foco por teclado |
| CA-007 | Sessão expirada não mantém dados | e2e `auth-login` (expiração), `http.test`, `session-expiry.test` |
| CA-008 | Política de senha no backend | `password-policy.spec`, e2e `auth-login` (CA-008), `RegisterForm.test` |
| CA-009 | Cadastro duplicado não expõe dados | e2e `auth-login` (CA-009 + caixa diferente), `RegisterForm.test` |
| CA-010 | Confirmação de e-mail exigida | e2e `auth-login` (verificação), `VerifyEmailPanel.test`, Navegador |
| CA-011 | Navegação para Login | `RegisterForm.test` |
| CA-012 | Responsivo e acessível | Navegador, `Alert/TextField/Checkbox/PasswordField.test` |
| CA-013 | Recuperação não revela e-mail | e2e `auth-password`, `ForgotPasswordForm.test`, Navegador |
| CA-014 | Token expirado/usado/inválido recusado | e2e `auth-password`, `ResetPasswordForm.test`, Navegador |
| CA-015 | Nova senha encerra sessões | e2e `auth-password`, `ResetPasswordForm.test` |
| CA-016 | Comunicação acessível de sucesso/falha | `Alert.test` (role alert/status), `ForgotPasswordForm.test`, `ResetPasswordForm.test` |
| CA-017 | MFA pendente não acessa dados privados | e2e `auth-mfa`, `session-status.spec`, `guards.test` |
| CA-018 | Código válido conclui o desafio | e2e `auth-mfa` (troca de token), `totp.service.spec` (vetores RFC 6238), `MfaForm.test` |
| CA-019 | Inválido/repetido recusado + antiabuso | e2e `auth-mfa` (replay, limite de tentativas), `MfaForm.test` |
| CA-020 | Recuperação segura e auditável | e2e `auth-mfa` (códigos de uso único, reenrolamento, auditoria) |

## 2. Regras de negócio → implementação e testes

| RN | Implementação | Verificação |
|---|---|---|
| RN-AUTH-001 | Toda decisão no backend; frontend só orienta navegação | e2e (todos) |
| RN-AUTH-002 | `ApiErrors.invalidCredentials`, resposta idêntica | e2e CA-004 |
| RN-AUTH-003 | Só hashes de token/código; auditoria sem segredos; links no fragmento `#token=`; SMTP sem log de conteúdo | `token.service.spec`, `smtp.mailer.spec`, e2e (auditoria sem senha/token) |
| RN-AUTH-004 | `RateLimiterService` + `AUTH_LIMITS` (par e-mail+IP, e-mail, IP) | `rate-limiter.service.spec`, e2e |
| RN-AUTH-005 | `SessionService.revoke*` | e2e (logout revoga, reset revoga todas) |
| RN-AUTH-006 | `CsrfGuard` global (header + Origin) + `SameSite=Lax` | `csrf.guard.spec`, e2e |
| RN-AUTH-007 | Cookie `HttpOnly`, `SameSite=Lax`, `Secure` + `__Host-` em produção | e2e, Navegador |
| RN-AUTH-008 | Token novo a cada login e ao concluir MFA; guards negam por padrão | e2e, `guards.test` |
| RN-AUTH-009 | `email_verification_required` bloqueia rotas `@Auth('full')` | e2e, `guards.test` |
| RN-AUTH-010 | Token de uso único, consumo atômico, validade curta | e2e `auth-password` |
| RN-AUTH-011 | `deriveAuthStatus`: MFA ativo e não verificado nunca é `authenticated` | `session-status.spec`, e2e |
| RN-AUTH-012 | Seleção de família é só navegação; autorização por recurso entra com o módulo de Gestão Familiar | e2e `auth-context`, `resolve-destination.test` |

## 3. Decisões tomadas nas lacunas (alternativa conservadora e reversível)

| Tema | Decisão |
|---|---|
| Sessão | Cookie opaco `HttpOnly`; no banco só o HMAC do token; "manter sessão" só muda a duração (12 h x 30 dias; valores definidos pela engenharia) |
| CSRF | Header `X-CSRF-Protection: 1` obrigatório em escritas + verificação de `Origin` + `SameSite=Lax` |
| Hash de senha | Argon2id (parâmetros padrão da biblioteca `argon2`) |
| Política de senha | 12–128 caracteres com maiúscula, minúscula, número e caractere especial; não pode repetir um caractere nem igualar e-mail/nome. **Sem** lista de senhas vazadas ainda |
| E-mail no banco | HMAC-SHA-256 (`emailHmac`) para identificar/buscar + cópia AES-256-GCM (`emailCriptografado`) para enviar/exibir. Chaves dedicadas `EMAIL_HMAC_KEY` / `EMAIL_ENCRYPTION_KEY` |
| Cadastro | Não cria sessão; o usuário confirma o e-mail e depois faz login. Resposta idêntica para e-mail novo ou existente |
| E-mail não confirmado | Login cria sessão em estado `email_verification_required` (sem dados privados); o reenvio exige essa sessão |
| Limites | Login 5 falhas/15 min por e-mail+IP, 20 por e-mail, 30 por IP; cadastro 10/h por IP e 3/h por e-mail; recuperação 10/h por IP e 3/h por e-mail (silencioso); reenvio 3/h; MFA 5 falhas/5 min. **Em memória** (instância única) |
| MFA | TOTP RFC 6238 (SHA-1, 6 dígitos, ±1 passo), proteção contra replay por passo, 10 códigos de recuperação de uso único, segredo AES-256-GCM. Reenrolamento (`/auth/mfa/disable`) exige senha + segundo fator e encerra as outras sessões |
| Contexto (AUTH-005) | Convite pendente só tem precedência para quem não tem nenhuma família; com família, o convite aparece apenas listado |
| Aceite de termos | Exigido na API e registrado na auditoria (`termosAceitos`). Texto jurídico e tabela de consentimentos **pendentes de validação** |
| E-mail transacional | `nodemailer` quando `SMTP_HOST` existe; sem SMTP, só em desenvolvimento grava arquivos em `.dev-outbox`; em produção sem SMTP o app não sobe |
| Auditoria | Falha ao gravar auditoria é logada e não derruba a operação |

## 4. Revisão de clean code (resumo)

- **Camadas:** controllers finos (HTTP/cookies) → serviços de caso de uso → Prisma. Regras puras isoladas e testadas (`password-policy`, `session-status`, `totp`, `resolve-destination`, `form-errors`).
- **Reuso:** `AesGcmCipher` serve MFA e e-mail; `RateLimiterService` serve todos os fluxos; no frontend `TextField → PasswordField`, `FieldMessage`, `Alert`, `Button`, `BrandLayout`, `SessionGate` e guards compõem todas as telas (nenhuma tela recria componente).
- **Frontend modular:** `app/` (composição, providers, rotas), `modules/<feature>/{components,pages,hooks,services,schemas,guards,navigation,state}` com API pública em `index.ts`, `shared/{ui,layouts,lib,routes,styles}`. Módulos não importam de dentro uns dos outros.
- **Tokens:** nenhum hex/px solto fora de `shared/styles/tokens.css`.
- **Qualidade automática:** `tsc`, ESLint (backend e frontend), Prettier no backend e build de produção sem erros.

## 5. Pendências e riscos conhecidos

1. **Telas de enrolamento MFA** (QR code, exibição dos códigos de recuperação): o backend está pronto (`/auth/mfa/setup|enable|disable`), mas essas telas não estão no inventário AUTH-001..005 e ainda não existem.
2. **Entrega real de e-mail:** o adaptador `nodemailer` é coberto por testes unitários, mas ainda não foi validado com um servidor SMTP real.
3. **Limites em memória:** reiniciar o processo zera os contadores; com mais de uma instância é preciso um armazenamento compartilhado (Redis).
4. **Obrigatoriedade do MFA** (inclusive para administradores) e **textos jurídicos**: decisões de negócio abertas antes do go-live.
5. **Lista de senhas vazadas**, **tabela de consentimentos** e **notificação ao usar código de recuperação**: melhorias não implementadas.
6. **Bundle do frontend** (~544 kB): dividir por rota com `React.lazy` quando houver mais módulos.
7. **Rotação de `EMAIL_ENCRYPTION_KEY`/`EMAIL_HMAC_KEY`:** trocar a chave invalida o acesso aos e-mails já gravados; não há procedimento de rotação.
8. Telas `/familia/nova`, `/familia/convites` e `/app` são **marcadores** da transição AUTH-005; a funcionalidade pertence aos módulos seguintes do roadmap.
