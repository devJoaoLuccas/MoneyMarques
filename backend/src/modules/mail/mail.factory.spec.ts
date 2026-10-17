import { FileOutboxMailer } from './file-outbox.mailer';
import { createMailer } from './mail.factory';
import { SmtpMailer } from './smtp.mailer';

const smtp = {
  host: 'smtp.exemplo.com',
  port: 587,
  secure: false,
  from: 'no-reply@exemplo.com',
};

describe('createMailer', () => {
  it('usa SMTP (nodemailer) quando configurado, em qualquer ambiente', () => {
    expect(
      createMailer({ smtp, isProduction: false, outboxDir: '/tmp/x' }),
    ).toBeInstanceOf(SmtpMailer);
    expect(
      createMailer({ smtp, isProduction: true, outboxDir: '/tmp/x' }),
    ).toBeInstanceOf(SmtpMailer);
  });

  it('em desenvolvimento sem SMTP, grava e-mails em arquivo (nada e enviado)', () => {
    expect(
      createMailer({ smtp: null, isProduction: false, outboxDir: '/tmp/x' }),
    ).toBeInstanceOf(FileOutboxMailer);
  });

  it('em producao sem SMTP, falha na inicializacao em vez de simular o envio', () => {
    expect(() =>
      createMailer({ smtp: null, isProduction: true, outboxDir: '/tmp/x' }),
    ).toThrow(/SMTP_HOST/);
  });
});
