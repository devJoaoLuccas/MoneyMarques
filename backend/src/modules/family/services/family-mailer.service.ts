import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../../../config/auth.config';
import { PapelFamilia } from '../../../generated/prisma/enums';
import { renderEmailTemplate } from '../../mail/email-template';
import { MailPort } from '../../mail/mail.port';

const SIGNATURE = 'Equipe Money Marques';

const PAPEL_LABEL: Record<PapelFamilia, string> = {
  ADMINISTRADOR: 'administrador',
  INTEGRANTE: 'integrante',
  VISUALIZADOR: 'visualizador',
};

export interface InviteEmail {
  to: string;
  familiaNome: string;
  convidadoPorNome: string;
  papel: PapelFamilia;
  token: string;
  expiraEm: Date;
}

/**
 * E-mails do modulo de familia, no template HTML base. O token vai apenas no
 * fragmento da URL (#token=), como nos e-mails de autenticacao (AUTH-003).
 */
@Injectable()
export class FamilyMailer {
  constructor(
    private readonly mail: MailPort,
    private readonly config: AuthConfig,
  ) {}

  sendInvite(invite: InviteEmail): Promise<void> {
    const origin = this.config.frontendOrigin;
    const link = `${origin}/convite#token=${invite.token}`;
    const papel = PAPEL_LABEL[invite.papel];
    const validade = this.formatDate(invite.expiraEm);
    const intro = `${invite.convidadoPorNome} convidou você para participar da família "${invite.familiaNome}" no Money Marques, como ${papel}.`;

    return this.mail.send({
      to: invite.to,
      subject: `Convite para a família ${invite.familiaNome} — Money Marques`,
      text: [
        intro,
        '',
        'Para ver e responder ao convite:',
        link,
        '',
        `O convite vale até ${validade} e só pode ser usado uma vez.`,
        'Se você não esperava este convite, ignore esta mensagem.',
        '',
        SIGNATURE,
      ].join('\n'),
      html: renderEmailTemplate(
        {
          preview: `Você foi convidado para a família ${invite.familiaNome}.`,
          title: `Convite para a família ${invite.familiaNome}`,
          paragraphs: [
            intro,
            'Entre ou crie sua conta com este mesmo e-mail para aceitar o convite.',
          ],
          action: { label: 'Ver convite', url: link },
          note: `O convite vale até ${validade} e só pode ser usado uma vez. Se você não esperava este convite, ignore esta mensagem.`,
        },
        { termsUrl: `${origin}/termos`, privacyUrl: `${origin}/privacidade` },
      ),
    });
  }

  /** DD/MM/AAAA (formato do produto), em UTC para ser deterministico. */
  private formatDate(date: Date): string {
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${date.getUTCFullYear()}`;
  }
}
