import { validatePasswordPolicy } from './password-policy';

describe('validatePasswordPolicy (CA-008)', () => {
  it('aceita senha forte com maiuscula, minuscula, numero e especial', () => {
    expect(validatePasswordPolicy('Minha-Senha-Forte-2026')).toEqual([]);
    expect(validatePasswordPolicy('Frase secreta longa 1!')).toEqual([]);
  });

  it('rejeita senha curta', () => {
    expect(validatePasswordPolicy('Curta1!')).toHaveLength(1);
  });

  it('rejeita senha acima do limite', () => {
    expect(validatePasswordPolicy('aB1!'.repeat(40))).toHaveLength(1);
  });

  it('rejeita um unico caractere repetido', () => {
    expect(validatePasswordPolicy('x'.repeat(14))).toContain(
      'A senha nao pode repetir um unico caractere.',
    );
  });

  it.each([
    ['sem maiuscula', 'minha-senha-forte-2026', 'maiuscula'],
    ['sem minuscula', 'MINHA-SENHA-FORTE-2026', 'minuscula'],
    ['sem numero', 'Minha-Senha-Forte-Segura', 'numero'],
    ['sem especial', 'MinhaSenhaForte2026', 'especial'],
    ['so espaco como simbolo', 'Minha senha forte 2026', 'especial'],
  ])('rejeita senha %s', (_caso, senha, trecho) => {
    const problems = validatePasswordPolicy(senha);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(trecho);
  });

  it('rejeita senha igual ao e-mail ou ao nome', () => {
    const mensagem = 'A senha nao pode ser igual ao seu e-mail ou nome.';
    expect(
      validatePasswordPolicy('ana.silva@exemplo.com', {
        email: 'ANA.SILVA@exemplo.com',
      }),
    ).toContain(mensagem);
    expect(
      validatePasswordPolicy('ana maria da silva', {
        nomeCompleto: 'Ana Maria da Silva',
      }),
    ).toContain(mensagem);
  });
});
