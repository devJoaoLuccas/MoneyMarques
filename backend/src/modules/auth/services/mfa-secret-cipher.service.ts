import { Injectable } from '@nestjs/common';
import { AesGcmCipher } from '../../../common/security/aes-gcm.cipher';
import { AuthConfig } from '../../../config/auth.config';

/** Criptografia do segredo TOTP em repouso (AUTH-004), com a chave do MFA. */
@Injectable()
export class MfaSecretCipher extends AesGcmCipher {
  constructor(config: AuthConfig) {
    super(config.mfaEncryptionKey);
  }
}
