import {
  generateInviteCode,
  isWellFormedInviteCode,
  normalizeInviteCode,
} from './invite-code';

describe('codigo de convite', () => {
  it('gera XXXX-XXXX apenas com o alfabeto sem ambiguidade', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('usa a fonte de aleatoriedade injetada (testavel)', () => {
    expect(generateInviteCode(() => 0)).toBe('AAAA-AAAA');
  });

  it('normaliza espacos, hifen e minusculas', () => {
    expect(normalizeInviteCode(' abcd-ef gh ')).toBe('ABCDEFGH');
  });

  it('valida o formato normalizado', () => {
    expect(isWellFormedInviteCode('ABCDEFGH')).toBe(true);
    expect(isWellFormedInviteCode('ABCDEFG')).toBe(false);
    expect(isWellFormedInviteCode('ABCDEFG0')).toBe(false);
    expect(isWellFormedInviteCode('ABCDEFGHI')).toBe(false);
  });

  it('um codigo gerado sempre passa na validacao depois de normalizado', () => {
    for (let i = 0; i < 100; i++) {
      expect(
        isWellFormedInviteCode(normalizeInviteCode(generateInviteCode())),
      ).toBe(true);
    }
  });
});
