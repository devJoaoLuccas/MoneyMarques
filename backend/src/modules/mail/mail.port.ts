export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Porta de envio de e-mail. A aplicacao depende apenas desta abstracao;
 * o transporte (SMTP, provedor transacional) e um adaptador substituivel.
 */
export abstract class MailPort {
  abstract send(message: MailMessage): Promise<void>;
}
