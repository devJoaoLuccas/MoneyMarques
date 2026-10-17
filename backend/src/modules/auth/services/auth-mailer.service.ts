import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../../../config/auth.config';
import { MailPort } from '../../mail/mail.port';

const SIGNATURE = 'Equipe Money Marques';

/**
 * E-mails transacionais do modulo. Os tokens vao no fragmento da URL (#token=)
 * para nao serem enviados a servidores, logs ou cabecalho Referer (AUTH-003).
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
    return this.mail.send({
      to,
      subject: 'Confirme seu e-mail — Money Marques',
      text: [
        `Olá, ${nome}!`,
        '',
        'Confirme seu e-mail para ativar sua conta:',
        link,
        '',
        'O link expira em breve e só pode ser usado uma vez.',
        'Se você não criou uma conta, ignore esta mensagem.',
        '',
        SIGNATURE,
      ].join('\n'),
    });
  }

  /** Cadastro com e-mail ja existente: avisa o dono sem revelar nada ao solicitante (CA-009). */
  sendAccountAlreadyExists(to: string): Promise<void> {
    return this.mail.send({
      to,
      subject: 'Tentativa de cadastro — Money Marques',
      text: [
        'Alguém tentou criar uma conta com este e-mail, mas ele já possui cadastro.',
        '',
        `Para entrar: ${this.config.frontendOrigin}/login`,
        `Esqueceu a senha? ${this.config.frontendOrigin}/esqueci-senha`,
        '',
        'Se não foi você, nenhuma ação é necessária.',
        '',
        SIGNATURE,
      ].join('\n'),
    });
  }

  sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.config.frontendOrigin}/redefinir-senha#token=${token}`;
    return this.mail.send({
      to,
      subject: 'Redefinição de senha — Money Marques',
      text: [
        'Recebemos um pedido para redefinir sua senha:',
        link,
        '',
        'O link expira em breve e só pode ser usado uma vez.',
        'Se você não fez o pedido, ignore esta mensagem; sua senha continua a mesma.',
        '',
        SIGNATURE,
      ].join('\n'),
    });
  }

  sendPasswordChanged(to: string): Promise<void> {
    return this.mail.send({
      to,
      subject: 'Sua senha foi alterada — Money Marques',
      text: [
        'A senha da sua conta foi alterada e todas as sessões foram encerradas.',
        '',
        `Se não foi você, redefina a senha imediatamente: ${this.config.frontendOrigin}/esqueci-senha`,
        '',
        SIGNATURE,
      ].join('\n'),
    });
  }
}
