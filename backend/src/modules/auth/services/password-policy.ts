export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordPolicyContext {
  email?: string;
  nomeCompleto?: string;
}

/**
 * Politica de senha do servidor (CA-008): tamanho minimo/maximo e composicao
 * (maiuscula, minuscula, numero e caractere especial). Caractere especial e
 * qualquer simbolo que nao seja letra, numero ou espaco. Retorna a lista de
 * problemas (vazia quando a senha e aceita).
 */
export function validatePasswordPolicy(
  senha: string,
  context: PasswordPolicyContext = {},
): string[] {
  const problems: string[] = [];

  if (senha.length < PASSWORD_MIN_LENGTH) {
    problems.push(
      `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    );
  }
  if (senha.length > PASSWORD_MAX_LENGTH) {
    problems.push(
      `A senha deve ter no maximo ${PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }
  if (!/\p{Lu}/u.test(senha)) {
    problems.push('A senha deve ter pelo menos uma letra maiuscula.');
  }
  if (!/\p{Ll}/u.test(senha)) {
    problems.push('A senha deve ter pelo menos uma letra minuscula.');
  }
  if (!/\p{N}/u.test(senha)) {
    problems.push('A senha deve ter pelo menos um numero.');
  }
  if (!/[^\p{L}\p{N}\s]/u.test(senha)) {
    problems.push('A senha deve ter pelo menos um caractere especial.');
  }
  if (senha.length > 0 && new Set(senha).size === 1) {
    problems.push('A senha nao pode repetir um unico caractere.');
  }

  const normalized = senha.trim().toLowerCase();
  const email = context.email?.trim().toLowerCase();
  const nome = context.nomeCompleto?.trim().toLowerCase();
  if (normalized && (normalized === email || normalized === nome)) {
    problems.push('A senha nao pode ser igual ao seu e-mail ou nome.');
  }

  return problems;
}
