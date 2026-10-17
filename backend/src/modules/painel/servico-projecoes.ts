import { Injectable } from '@nestjs/common';
import {
  fluxoDiario,
  menorSaldo,
  projetarMeses,
  type MovimentoPrevisto,
} from './domain/projecao';
import {
  deslocarPeriodo,
  periodoDoInstante,
  ultimoDiaCivil,
} from './domain/periodo';
import type { ContextoFinanceiro } from './politica-acesso-financeiro';
import { RepositorioFinanceiro } from './repositorio-financeiro';
import { respostaBase, str } from './resposta';
import type { DiaFluxoDto, ProjecoesDto } from './painel.types';

export const HORIZONTE_MESES = 12;

const OBSERVACAO =
  'Previsto, não realizado: considera lançamentos em aberto e faturas de cartão já registrados. ' +
  'Recorrências ainda não geradas não entram. Receitas previstas não são dinheiro disponível.';

const paraDia = (d: {
  data: string;
  entradasPrevistasCentavos: bigint;
  saidasPrevistasCentavos: bigint;
  saldoCentavos: bigint;
}): DiaFluxoDto => ({
  data: d.data,
  entradasPrevistasCentavos: str(d.entradasPrevistasCentavos),
  saidasPrevistasCentavos: str(d.saidasPrevistasCentavos),
  saldoCentavos: str(d.saldoCentavos),
});

/**
 * DASH-005: saldo final mensal (12 meses) e fluxo de caixa DIARIO do mes
 * atual, que sao coisas distintas. O saldo final de um mes e o inicial do
 * seguinte; a projecao sempre parte do mes atual.
 */
@Injectable()
export class ServicoProjecoes {
  constructor(private readonly repo: RepositorioFinanceiro) {}

  async obter(ctx: ContextoFinanceiro): Promise<ProjecoesDto> {
    const periodoAtual = periodoDoInstante(ctx.agora);
    const ultimoPeriodo = deslocarPeriodo(periodoAtual, HORIZONTE_MESES - 1);
    const [saldo, abertos, faturas] = await Promise.all([
      this.repo.saldoContas(ctx),
      this.repo.lancamentosAbertos(ctx, ultimoPeriodo),
      this.repo.faturasNaoQuitadas(ctx),
    ]);

    const base = { ...respostaBase(ctx, periodoAtual), observacao: OBSERVACAO };
    if (saldo === null) {
      return {
        ...base,
        saldoInicialCentavos: null,
        meses: [],
        fluxoDiarioMesAtual: [],
        menorSaldoMesAtual: null,
      };
    }

    const movimentos: MovimentoPrevisto[] = [
      ...abertos.map((a) => ({
        data: a.vencimento,
        tipo: a.tipo === 'RECEITA' ? ('entrada' as const) : ('saida' as const),
        valorCentavos: a.restanteCentavos,
      })),
      ...faturas
        .filter((f) => f.dataVencimento <= ultimoDiaCivil(ultimoPeriodo))
        .map((f) => ({
          data: f.dataVencimento,
          tipo: 'saida' as const,
          valorCentavos: f.saldoDevedorCentavos,
        })),
    ];

    const dias = fluxoDiario(saldo, movimentos, ctx.hojeCivil, periodoAtual);
    const menor = menorSaldo(dias);
    return {
      ...base,
      saldoInicialCentavos: str(saldo),
      meses: projetarMeses(
        saldo,
        movimentos,
        periodoAtual,
        HORIZONTE_MESES,
      ).map((m) => ({
        periodo: m.periodo,
        saldoInicialCentavos: str(m.saldoInicialCentavos),
        entradasPrevistasCentavos: str(m.entradasPrevistasCentavos),
        saidasPrevistasCentavos: str(m.saidasPrevistasCentavos),
        saldoFinalCentavos: str(m.saldoFinalCentavos),
      })),
      fluxoDiarioMesAtual: dias.map(paraDia),
      menorSaldoMesAtual: menor ? paraDia(menor) : null,
    };
  }
}
