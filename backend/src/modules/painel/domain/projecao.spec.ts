import {
  fluxoDiario,
  menorSaldo,
  projetarMeses,
  type MovimentoPrevisto,
} from './projecao';

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const entrada = (data: string, v: bigint): MovimentoPrevisto => ({
  data: dia(data),
  tipo: 'entrada',
  valorCentavos: v,
});
const saida = (data: string, v: bigint): MovimentoPrevisto => ({
  data: dia(data),
  tipo: 'saida',
  valorCentavos: v,
});

describe('projetarMeses', () => {
  it('encadeia: saldo final de um mes e o inicial do seguinte', () => {
    const r = projetarMeses(
      100_000n,
      [
        entrada('2026-10-25', 50_000n),
        saida('2026-10-20', 30_000n),
        saida('2026-11-05', 200_000n),
      ],
      '2026-10',
      3,
    );
    expect(r.map((m) => m.periodo)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(r[0].saldoFinalCentavos).toBe(120_000n);
    expect(r[1].saldoInicialCentavos).toBe(120_000n);
    expect(r[1].saldoFinalCentavos).toBe(-80_000n);
    expect(r[2].saldoFinalCentavos).toBe(-80_000n);
  });

  it('atrasado cai no primeiro mes da projecao', () => {
    const r = projetarMeses(0n, [saida('2026-08-10', 10_000n)], '2026-10', 2);
    expect(r[0].saidasPrevistasCentavos).toBe(10_000n);
    expect(r[1].saidasPrevistasCentavos).toBe(0n);
  });

  it('itens alem do horizonte nao entram', () => {
    const r = projetarMeses(0n, [saida('2027-05-10', 10_000n)], '2026-10', 3);
    expect(r.every((m) => m.saidasPrevistasCentavos === 0n)).toBe(true);
  });

  it('nao tem ponto flutuante: soma acima de 2^53', () => {
    const r = projetarMeses(
      9_007_199_254_740_993n,
      [entrada('2026-10-02', 1n)],
      '2026-10',
      1,
    );
    expect(r[0].saldoFinalCentavos).toBe(9_007_199_254_740_994n);
  });
});

describe('fluxoDiario', () => {
  const hoje = dia('2026-10-17');

  it('acumula dia a dia ate o fim do mes e acha o menor saldo', () => {
    const dias = fluxoDiario(
      100_000n,
      [saida('2026-10-20', 150_000n), entrada('2026-10-28', 80_000n)],
      hoje,
      '2026-10',
    );
    expect(dias[0].data).toBe('2026-10-17');
    expect(dias.at(-1)?.data).toBe('2026-10-31');
    expect(dias.at(-1)?.saldoCentavos).toBe(30_000n);
    expect(menorSaldo(dias)).toMatchObject({
      data: '2026-10-20',
      saldoCentavos: -50_000n,
    });
  });

  it('atrasados contam em hoje', () => {
    const dias = fluxoDiario(
      10_000n,
      [saida('2026-10-01', 4_000n)],
      hoje,
      '2026-10',
    );
    expect(dias[0].saidasPrevistasCentavos).toBe(4_000n);
    expect(dias[0].saldoCentavos).toBe(6_000n);
  });

  it('menorSaldo de lista vazia e nulo', () => {
    expect(menorSaldo([])).toBeNull();
  });
});
