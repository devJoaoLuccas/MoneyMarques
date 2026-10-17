import { AuthConfig } from '../../../config/auth.config';
import { MailMessage, MailPort } from '../../mail/mail.port';
import { AuthMailer } from './auth-mailer.service';

class CapturingMail extends MailPort {
  readonly messages: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }
}

describe('AuthMailer (template HTML base)', () => {
  const origin = 'https://app.exemplo.com';
  const config = { frontendOrigin: origin } as AuthConfig;

  function setup() {
    const mail = new CapturingMail();
    return { mail, mailer: new AuthMailer(mail, config) };
  }

  it('todos os e-mails levam HTML do template base, com texto e links legais', async () => {
    const { mail, mailer } = setup();

    await mailer.sendEmailVerification('a@b.com', 'Ana', 'tok_1');
    await mailer.sendAccountAlreadyExists('a@b.com');
    await mailer.sendPasswordReset('a@b.com', 'tok_2');
    await mailer.sendPasswordChanged('a@b.com');

    expect(mail.messages).toHaveLength(4);
    for (const message of mail.messages) {
      expect(message.text.length).toBeGreaterThan(0);
      expect(message.html).toContain('<!DOCTYPE html>');
      expect(message.html).toContain('alt="Money Marques"');
      expect(message.html).toContain(`href="${origin}/termos"`);
      expect(message.html).toContain(`href="${origin}/privacidade"`);
    }
  });

  it('mantem o token no fragmento da URL, no HTML e no texto', async () => {
    const { mail, mailer } = setup();

    await mailer.sendEmailVerification('a@b.com', 'Ana', 'tok_1');
    await mailer.sendPasswordReset('a@b.com', 'tok_2');

    const [verification, reset] = mail.messages;
    expect(verification.text).toContain(
      `${origin}/verificar-email#token=tok_1`,
    );
    expect(verification.html).toContain(
      `${origin}/verificar-email#token=tok_1`,
    );
    expect(reset.text).toContain(`${origin}/redefinir-senha#token=tok_2`);
    expect(reset.html).toContain(`${origin}/redefinir-senha#token=tok_2`);
  });

  it('escapa o nome do usuario no HTML', async () => {
    const { mail, mailer } = setup();

    await mailer.sendEmailVerification('a@b.com', '<b>Ana</b>', 'tok');

    expect(mail.messages[0].html).not.toContain('<b>Ana</b>');
    expect(mail.messages[0].html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
  });
});
