import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { AesGcmCipher } from '../../../common/security/aes-gcm.cipher';
import { AuthConfig } from '../../../config/auth.config';

export interface SealedEmail {
  /** HMAC-SHA-256 do e-mail normalizado: identificador de busca e unicidade. */
  emailHmac: string;
  /** E-mail cifrado (AES-256-GCM): recuperavel para envio e exibicao. */
  emailCriptografado: string;
}

/**
 * Protecao de e-mails no banco (RF-013). Nenhum e-mail fica em texto puro:
 * - HMAC-SHA-256 (chave EMAIL_HMAC_KEY) e deterministico e irreversivel:
 *   permite login, unicidade e busca sem expor o endereco;
 * - a copia cifrada (chave EMAIL_ENCRYPTION_KEY) existe porque o sistema
 *   precisa do endereco para enviar e-mails e exibi-lo ao proprio usuario.
 * As chaves sao distintas entre si e das de token e MFA (separacao de chaves).
 */
@Injectable()
export class EmailVaultService {
  private readonly cipher: AesGcmCipher;

  constructor(private readonly config: AuthConfig) {
    this.cipher = new AesGcmCipher(config.emailEncryptionKey);
  }

  normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  hmac(email: string): string {
    return createHmac('sha256', this.config.emailHmacKey)
      .update(this.normalize(email))
      .digest('hex');
  }

  seal(email: string): SealedEmail {
    return {
      emailHmac: this.hmac(email),
      emailCriptografado: this.cipher.encrypt(this.normalize(email)),
    };
  }

  open(emailCriptografado: string): string {
    return this.cipher.decrypt(emailCriptografado);
  }
}
