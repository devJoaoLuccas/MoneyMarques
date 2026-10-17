/** Exposicao de e-mail para quem nao e admin (D-FAM-007): `a***@dominio.com`. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}
