import { Injectable } from '@nestjs/common';
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { AuthConfig } from '../../../config/auth.config';

// Alfabeto sem caracteres ambiguos (0/O, 1/I/L).
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RECOVERY_GROUP = 5;

/**
 * Tokens opacos (sessao, e-mail, reset) e codigos de recuperacao.
 * Somente o HMAC (com pepper) e persistido; o valor original nunca e gravado.
 */
@Injectable()
export class TokenService {
  constructor(private readonly config: AuthConfig) {}

  generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  hash(value: string): string {
    return createHmac('sha256', this.config.tokenPepper)
      .update(value)
      .digest('hex');
  }

  safeEquals(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  /** Codigo de recuperacao no formato XXXXX-XXXXX. */
  generateRecoveryCode(): string {
    const group = () =>
      Array.from(
        { length: RECOVERY_GROUP },
        () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)],
      ).join('');
    return `${group()}-${group()}`;
  }

  /** Normaliza a digitacao do usuario antes de calcular o hash. */
  normalizeRecoveryCode(input: string): string {
    return input.replace(/[\s-]/g, '').toUpperCase();
  }

  hashRecoveryCode(code: string): string {
    return this.hash(`recovery:${this.normalizeRecoveryCode(code)}`);
  }
}
