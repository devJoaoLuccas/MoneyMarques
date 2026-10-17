import { randomInt } from 'node:crypto';

// Alfabeto sem caracteres ambiguos (0/O, 1/I/L): 31 simbolos, 8 posicoes =
// 31^8 (~8,5e11, ~39 bits). A seguranca vem da combinacao com validade curta,
// uso unico e limite de tentativas erradas por usuario.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;
const FORMAT = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/;

/** Codigo no formato XXXX-XXXX (o hifen e so de leitura). */
export function generateInviteCode(
  random: (max: number) => number = randomInt,
): string {
  const chars = Array.from(
    { length: INVITE_CODE_LENGTH },
    () => ALPHABET[random(ALPHABET.length)],
  );
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/** Tolera espacos, hifen e minusculas na digitacao. */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export function isWellFormedInviteCode(normalized: string): boolean {
  return FORMAT.test(normalized);
}
