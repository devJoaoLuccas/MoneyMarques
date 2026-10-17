import { SmtpConfig } from '../../config/smtp.config';
import { FileOutboxMailer } from './file-outbox.mailer';
import { MailPort } from './mail.port';
import { SmtpMailer } from './smtp.mailer';

export interface MailerOptions {
  smtp: SmtpConfig | null;
  isProduction: boolean;
  /** Pasta usada pelo adaptador de desenvolvimento quando nao ha SMTP. */
  outboxDir: string;
}

/**
 * Escolhe o adaptador de e-mail: SMTP (nodemailer) quando configurado; sem
 * SMTP, apenas em desenvolvimento grava em arquivo. Em producao sem SMTP a
 * aplicacao nao sobe, em vez de fingir que enviou.
 */
export function createMailer(options: MailerOptions): MailPort {
  if (options.smtp) return SmtpMailer.fromConfig(options.smtp);

  if (options.isProduction) {
    throw new Error(
      'SMTP_HOST nao configurado: o envio de e-mail e obrigatorio em producao.',
    );
  }
  return new FileOutboxMailer(options.outboxDir);
}
