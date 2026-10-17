import { createTransport } from 'nodemailer';
import { SmtpConfig } from '../../config/smtp.config';
import { MailMessage, MailPort } from './mail.port';

/** Parte do transporte do nodemailer usada aqui (facilita testar sem rede). */
export interface SmtpTransport {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<unknown>;
}

/**
 * Adaptador SMTP baseado em nodemailer. Nao registra o conteudo das
 * mensagens: os links com token nunca vao para logs (RN-AUTH-003).
 */
export class SmtpMailer extends MailPort {
  constructor(
    private readonly transport: SmtpTransport,
    private readonly from: string,
  ) {
    super();
  }

  static fromConfig(config: SmtpConfig): SmtpMailer {
    const transport = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
    return new SmtpMailer(transport, config.from);
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
