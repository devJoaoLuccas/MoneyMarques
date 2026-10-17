export interface MailMessage {
  to: string;
  subject: string;
  /** Versao em texto puro (alternativa para clientes sem HTML). */
  text: string;
  /** Versao HTML renderizada pelo template base. */
  html?: string;
}

/**
 * Porta de envio de e-mail. A aplicacao depende apenas desta abstracao;
 * o transporte (SMTP, provedor transacional) e um adaptador substituivel.
 */
export abstract class MailPort {
  abstract send(message: MailMessage): Promise<void>;
}
