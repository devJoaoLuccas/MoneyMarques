import { Injectable } from '@nestjs/common';
import { AuthContext, SessionView } from '../auth.types';
import { AuthContextService } from './auth-context.service';

/**
 * Monta a resposta publica do estado de autenticacao. Enquanto houver
 * pendencia (e-mail/MFA) somente o e-mail e exposto: nenhum dado privado
 * (CA-017).
 */
@Injectable()
export class SessionViewService {
  constructor(private readonly familyContext: AuthContextService) {}

  async build(auth: AuthContext | null): Promise<SessionView> {
    if (!auth) return { status: 'auth_required' };

    if (auth.status === 'authenticated') {
      return {
        status: 'authenticated',
        usuario: auth.usuario,
        mfaHabilitado: auth.mfaHabilitado,
        contexto: await this.familyContext.resolve(
          auth.usuario.uid,
          auth.usuario.email,
        ),
      };
    }

    return {
      status: auth.status,
      usuario: { email: auth.usuario.email },
      mfaHabilitado: auth.mfaHabilitado,
    };
  }
}
