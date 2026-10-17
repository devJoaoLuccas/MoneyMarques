import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../../../config/auth.config';
import { EmailContent, renderEmailTemplate } from '../../mail/email-template';
import { MailPort } from '../../mail/mail.port';

const SIGNATURE = 'Equipe Money Marques';

/**
 * E-mails transacionais do modulo. Todos usam o template HTML base
 * (renderEmailTemplate) e levam tambem a versao em texto. Os tokens vao no
 * fragmento da URL (#token=) para nao serem enviados a servidores, logs ou
 * cabecalho Referer (AUTH-003).
 */
@Injectable()
export class AuthMailer {
  constructor(
    private readonly mail: MailPort,
    private readonly config: AuthConfig,
  ) {}

  sendEmailVerification(
    to: string,
    nome: string,
    token: string,
  ): Promise<void> {
    const link = `${this.config.frontendOrigin}/verificar-email#token=${token}`;
    return this.deliver(
      to,
      'Confirme seu e-mail — Money Marques',
      {
        preview: 'Confirme seu e-mail para ativar sua conta.',
        title: 'Confirme seu e-mail',
        greeting: `Olá, ${nome}!`,
        paragraphs: [
          'Confirme seu e-mail para ativar sua conta Money Marques.',
        ],
        action: { label: 'Confirmar e-mail', url: link },
        note: 'O link expira em breve e só pode ser usado uma vez. Se você não criou uma conta, ignore esta mensagem.',
      },
      [
        `Olá, ${nome}!`,
        '',
        'Confirme seu e-mail para ativar sua conta:',
        link,
        '',
        'O link expira em breve e só pode ser usado uma vez.',
        'Se você não criou uma conta, ignore esta mensagem.',
        '',
        SIGNATURE,
      ],
    );
  }

  /** Cadastro com e-mail ja existente: avisa o dono sem revelar nada ao solicitante (CA-009). */
  sendAccountAlreadyExists(to: string): Promise<void> {
    const login = `${this.config.frontendOrigin}/login`;
    const forgot = `${this.config.frontendOrigin}/esqueci-senha`;
    return this.deliver(
      to,
      'Tentativa de cadastro — Money Marques',
      {
        preview: 'Alguém tentou criar uma conta com este e-mail.',
        title: 'Tentativa de cadastro',
        paragraphs: [
          'Alguém tentou criar uma conta com este e-mail, mas ele já possui cadastro.',
        ],
        action: { label: 'Entrar', url: login },
        secondaryLink: { label: 'Esqueceu a senha?', url: forgot },
        note: 'Se não foi você, nenhuma ação é necessária.',
      },
      [
        'Alguém tentou criar uma conta com este e-mail, mas ele já possui cadastro.',
        '',
        `Para entrar: ${login}`,
        `Esqueceu a senha? ${forgot}`,
        '',
        'Se não foi você, nenhuma ação é necessária.',
        '',
        SIGNATURE,
      ],
    );
  }

  sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.config.frontendOrigin}/redefinir-senha#token=${token}`;
    return this.deliver(
      to,
      'Redefinição de senha — Money Marques',
      {
        preview: 'Recebemos um pedido para redefinir sua senha.',
        title: 'Redefinição de senha',
        paragraphs: ['Recebemos um pedido para redefinir sua senha.'],
        action: { label: 'Redefinir senha', url: link },
        note: 'O link expira em breve e só pode ser usado uma vez. Se você não fez o pedido, ignore esta mensagem; sua senha continua a mesma.',
      },
      [
        'Recebemos um pedido para redefinir sua senha:',
        link,
        '',
        'O link expira em breve e só pode ser usado uma vez.',
        'Se você não fez o pedido, ignore esta mensagem; sua senha continua a mesma.',
        '',
        SIGNATURE,
      ],
    );
  }

  sendPasswordChanged(to: string): Promise<void> {
    const forgot = `${this.config.frontendOrigin}/esqueci-senha`;
    return this.deliver(
      to,
      'Sua senha foi alterada — Money Marques',
      {
        preview: 'A senha da sua conta foi alterada.',
        title: 'Sua senha foi alterada',
        paragraphs: [
          'A senha da sua conta foi alterada e todas as sessões foram encerradas.',
        ],
        action: { label: 'Redefinir senha', url: forgot },
        note: 'Se não foi você, redefina a senha imediatamente.',
      },
      [
        'A senha da sua conta foi alterada e todas as sessões foram encerradas.',
        '',
        `Se não foi você, redefina a senha imediatamente: ${forgot}`,
        '',
        SIGNATURE,
      ],
    );
  }

  /** Envia a mensagem com a versao HTML (template base) e a versao em texto. */
  private deliver(
    to: string,
    subject: string,
    content: EmailContent,
    text: string[],
  ): Promise<void> {
    const origin = this.config.frontendOrigin;
    return this.mail.send({
      to,
      subject,
      text: text.join('\n'),
      html: renderEmailTemplate(content, {
        termsUrl: `${origin}/termos`,
        privacyUrl: `${origin}/privacidade`,
      }),
    });
  }
}
