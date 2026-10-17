import {
  participacaoBp,
  saldoProjetadoFinal,
  somar,
  taxaPoupancaBp,
  variacaoPercentualBp,
} from './indicadores';

describe('indicadores financeiros (centavos em BigInt, sem ponto flutuante)', () => {
  it('soma sem perda de precisao acima do limite seguro de number', () => {
    expect(somar([9007199254740993n, 1n, -2n])).toBe(9007199254740992n);
    expect(somar([])).toBe(0n);
  });

  describe('saldoProjetadoFinal = inicial + receitas previstas - saidas previstas', () => {
    it('calcula o saldo projetado', () => {
      expect(saldoProjetadoFinal(100_000n, 50_000n, 30_000n)).toBe(120_000n);
    });
    it('pode ser negativo', () => {
      expect(saldoProjetadoFinal(10_000n, 0n, 25_000n)).toBe(-15_000n);
    });
  });

  describe('taxaPoupancaBp = (receitas - despesas) / receitas, em pontos-base', () => {
    it('calcula a taxa', () => {
      expect(taxaPoupancaBp(100_000n, 75_000n)).toBe(2500);
    });
    it('e indisponivel sem receitas', () => {
      expect(taxaPoupancaBp(0n, 100n)).toBeNull();
    });
    it('pode ser negativa', () => {
      expect(taxaPoupancaBp(100_000n, 120_000n)).toBe(-2000);
    });
  });

  describe('variacaoPercentualBp = (atual - anterior) / anterior', () => {
    it('calcula a variacao', () => {
      expect(variacaoPercentualBp(120n, 100n)).toBe(2000);
    });
    it('e indisponivel quando o anterior e zero', () => {
      expect(variacaoPercentualBp(50n, 0n)).toBeNull();
    });
  });

  describe('participacaoBp', () => {
    it('calcula a fatia sobre o total', () => {
      expect(participacaoBp(25n, 100n)).toBe(2500);
    });
    it('e zero quando o total nao e positivo', () => {
      expect(participacaoBp(10n, 0n)).toBe(0);
    });
  });
});
