type Env = Record<string, string | undefined>;

export interface SmtpConfig {
  host: string;
  port: number;
  /** TLS implicito (porta 465). Nas demais portas o nodemailer negocia STARTTLS. */
  secure: boolean;
  auth?: { user: string; pass: string };
  from: string;
}

const DEFAULT_PORT = 587;
const IMPLICIT_TLS_PORT = 465;

/**
 * Le a configuracao SMTP do ambiente. Retorna null quando SMTP_HOST nao esta
 * definido (SMTP nao configurado); lanca erro quando esta definido de forma
 * incompleta ou invalida, para falhar na inicializacao.
 */
export function parseSmtpConfig(env: Env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = env.SMTP_PORT?.trim() ? Number(env.SMTP_PORT) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('SMTP_PORT deve ser uma porta valida (1-65535).');
  }

  const from = env.MAIL_FROM?.trim();
  if (!from) {
    throw new Error(
      'MAIL_FROM e obrigatorio quando SMTP_HOST esta configurado.',
    );
  }

  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASSWORD;
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('SMTP_USER e SMTP_PASSWORD devem ser informados juntos.');
  }

  const secure =
    env.SMTP_SECURE?.trim() !== undefined && env.SMTP_SECURE.trim() !== ''
      ? env.SMTP_SECURE.trim().toLowerCase() === 'true'
      : port === IMPLICIT_TLS_PORT;

  return {
    host,
    port,
    secure,
    ...(user && pass ? { auth: { user, pass } } : {}),
    from,
  };
}
