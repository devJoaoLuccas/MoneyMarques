import { maskEmail } from './mask-email';

describe('maskEmail (D-FAM-007)', () => {
  it('mantem a primeira letra e o dominio', () => {
    expect(maskEmail('ana.silva@exemplo.com')).toBe('a***@exemplo.com');
  });

  it('nao revela nada de locais curtos', () => {
    expect(maskEmail('a@b.com')).toBe('a***@b.com');
  });

  it('retorna mascara generica para valor invalido', () => {
    expect(maskEmail('sem-arroba')).toBe('***');
  });
});
