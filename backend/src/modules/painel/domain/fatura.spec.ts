import {
  saldoDevedorFatura,
  statusFatura,
  statusLancamento,
  totalFatura,
} from './fatura';

describe('fatura (valor e saldo devedor nao sao colunas)', () => {
  const base = { parcelas: [30_000n, 20_000n], ajustes: [], pagamentos: [] };

  it('soma as parcelas', () => {
    expect(totalFatura(base)).toBe(50_000n);
  });

  it('debito aumenta; credito e estorno reduzem', () => {
    const entrada = {
      ...base,
      ajustes: [
        { tipo: 'DEBITO' as const, valorCentavos: 1_000n },
        { tipo: 'CREDITO' as const, valorCentavos: 2_000n },
        { tipo: 'ESTORNO' as const, valorCentavos: 500n },
      ],
    };
    expect(totalFatura(entrada)).toBe(48_500n);
  });

  it('pagamento parcial reduz o saldo devedor sem contar a despesa duas vezes', () => {
    expect(saldoDevedorFatura({ ...base, pagamentos: [20_000n] })).toBe(
      30_000n,
    );
  });

  it('fatura quitada ou paga a maior tem saldo devedor zero', () => {
    expect(saldoDevedorFatura({ ...base, pagamentos: [50_000n] })).toBe(0n);
    expect(saldoDevedorFatura({ ...base, pagamentos: [60_000n] })).toBe(0n);
  });
});

describe('status de compromissos', () => {
  const hoje = '2026-10-17';

  it('lancamento liquidado e pago, mesmo com vencimento passado', () => {
    expect(statusLancamento('LIQUIDADO', '2026-10-01', hoje)).toBe('pago');
  });
  it('em aberto com vencimento passado e vencido', () => {
    expect(statusLancamento('PREVISTO', '2026-10-16', hoje)).toBe('vencido');
    expect(statusLancamento('PARCIALMENTE_LIQUIDADO', '2026-10-16', hoje)).toBe(
      'vencido',
    );
  });
  it('vencimento hoje ainda nao esta vencido', () => {
    expect(statusLancamento('PENDENTE', hoje, hoje)).toBe('pendente');
  });
  it('previsto x pendente', () => {
    expect(statusLancamento('PREVISTO', '2026-11-01', hoje)).toBe('previsto');
    expect(statusLancamento('PARCIALMENTE_LIQUIDADO', '2026-11-01', hoje)).toBe(
      'pendente',
    );
  });
  it('faturas', () => {
    expect(statusFatura('PAGA', '2026-01-01', hoje)).toBe('pago');
    expect(statusFatura('FECHADA', '2026-10-10', hoje)).toBe('vencido');
    expect(statusFatura('FECHADA', '2026-10-25', hoje)).toBe('pendente');
    expect(statusFatura('ABERTA', '2026-11-10', hoje)).toBe('previsto');
  });
});
