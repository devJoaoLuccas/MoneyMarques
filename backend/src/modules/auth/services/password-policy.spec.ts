import { validatePasswordPolicy } from './password-policy';

describe('validatePasswordPolicy (CA-008)', () => {
  it('aceita frase-senha longa sem caracteres especiais', () => {
    expect(validatePasswordPolicy('minha frase secreta longa')).toEqual([]);
  });

  it('rejeita senha curta', () => {
    expect(validatePasswordPolicy('curta123')).toHaveLength(1);
  });

  it('rejeita senha acima do limite', () => {
    expect(validatePasswordPolicy('a1'.repeat(70))).toHaveLength(1);
  });

  it('rejeita um unico caractere repetido', () => {
    expect(validatePasswordPolicy('x'.repeat(14))).toHaveLength(1);
  });

  it('rejeita senha igual ao e-mail ou ao nome', () => {
    expect(
      validatePasswordPolicy('ana.silva@exemplo.com', {
        email: 'ANA.SILVA@exemplo.com',
      }),
    ).toHaveLength(1);
    expect(
      validatePasswordPolicy('ana maria da silva', {
        nomeCompleto: 'Ana Maria da Silva',
      }),
    ).toHaveLength(1);
  });
});
