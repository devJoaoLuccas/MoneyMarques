import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_SECONDS = 30;
const DIGITS = 6;
/** Janela de tolerancia de relogio: +-1 passo (30 s) ao redor do atual. */
const WINDOW_STEPS = 1;

export interface TotpVerification {
  valid: boolean;
  /** Passo (contador) que validou o codigo; usado no controle de replay. */
  step?: number;
}

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Base32 invalido.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** TOTP conforme RFC 6238 (HMAC-SHA1, 6 digitos, passo de 30 s). */
@Injectable()
export class TotpService {
  generateSecret(): string {
    return base32Encode(randomBytes(20));
  }

  stepAt(timeMs: number): number {
    return Math.floor(timeMs / 1000 / PERIOD_SECONDS);
  }

  codeForStep(secretBase32: string, step: number, digits = DIGITS): string {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hmac = createHmac('sha1', base32Decode(secretBase32))
      .update(counter)
      .digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      (hmac[offset + 1] << 16) |
      (hmac[offset + 2] << 8) |
      hmac[offset + 3];
    return String(binary % 10 ** digits).padStart(digits, '0');
  }

  verify(
    secretBase32: string,
    code: string,
    timeMs = Date.now(),
  ): TotpVerification {
    if (!/^\d{6}$/.test(code)) return { valid: false };
    const current = this.stepAt(timeMs);
    for (let offset = -WINDOW_STEPS; offset <= WINDOW_STEPS; offset++) {
      const step = current + offset;
      const expected = Buffer.from(this.codeForStep(secretBase32, step));
      if (timingSafeEqual(expected, Buffer.from(code))) {
        return { valid: true, step };
      }
    }
    return { valid: false };
  }

  buildOtpauthUri(params: {
    secret: string;
    accountName: string;
    issuer: string;
  }): string {
    const label = encodeURIComponent(`${params.issuer}:${params.accountName}`);
    const query = new URLSearchParams({
      secret: params.secret,
      issuer: params.issuer,
      algorithm: 'SHA1',
      digits: String(DIGITS),
      period: String(PERIOD_SECONDS),
    });
    return `otpauth://totp/${label}?${query.toString()}`;
  }
}
