import { Injectable } from '@nestjs/common';
import { statusFatura } from './domain/fatura';
import { somar } from './domain/indicadores';
import {
  chaveDataCivil,
  periodoDaDataCivil,
  periodoDoInstante,
} from './domain/periodo';
import type { ContextoFinanceiro } from './politica-acesso-financeiro';
import {
  RepositorioFinanceiro,
  type FaturaCalculada,
} from './repositorio-financeiro';
import { respostaBase, str } from './resposta';
import type {
  CartaoPainelDto,
  CartoesPainelDto,
  FaturaResumoDto,
} from './painel.types';

const PROXIMAS = 3;

/**
 * DASH-003: por cartao autorizado, limite total/comprometido/disponivel, fatura
 * aberta e proximas faturas. Limite utilizado = parcelas de compras ATIVAS em
 * faturas nao pagas (decisao conservadora do modelo). Limite nao e saldo.
 */
@Injectable()
export class ServicoCartoes {
  constructor(private readonly repo: RepositorioFinanceiro) {}

  async obter(ctx: ContextoFinanceiro): Promise<CartoesPainelDto> {
    const faturas = await this.repo.faturasNaoQuitadas(ctx);
    const hoje = chaveDataCivil(ctx.hojeCivil);
    const resumo = (f: FaturaCalculada): FaturaResumoDto => ({
      uid: f.uid,
      competencia: periodoDaDataCivil(f.competencia),
      dataFechamento: chaveDataCivil(f.dataFechamento),
      dataVencimento: chaveDataCivil(f.dataVencimento),
      situacao: f.situacao,
      status: statusFatura(f.situacao, chaveDataCivil(f.dataVencimento), hoje),
      totalCentavos: str(f.totalCentavos),
      saldoDevedorCentavos: str(f.saldoDevedorCentavos),
    });

    const cartoes: CartaoPainelDto[] = ctx.cartoes.map((c) => {
      const doCartao = faturas.filter((f) => f.cartaoUid === c.uid);
      const utilizado = somar(doCartao.map((f) => f.parcelasCentavos));
      const aberta = doCartao.find((f) => f.situacao === 'ABERTA') ?? null;
      return {
        uid: c.uid,
        nome: c.nome,
        emissor: c.emissor,
        bandeira: c.bandeira,
        identificadorMascarado: c.identificadorMascarado,
        situacao: c.situacao,
        limiteCentavos: str(c.limiteCentavos),
        utilizadoCentavos: str(utilizado),
        disponivelCentavos: str(c.limiteCentavos - utilizado),
        diaFechamento: c.diaFechamento,
        diaVencimento: c.diaVencimento,
        faturaAberta: aberta ? resumo(aberta) : null,
        proximasFaturas: doCartao
          .filter((f) => f.uid !== aberta?.uid)
          .slice(0, PROXIMAS)
          .map(resumo),
      };
    });

    const limite = somar(ctx.cartoes.map((c) => c.limiteCentavos));
    const utilizado = somar(faturas.map((f) => f.parcelasCentavos));
    return {
      ...respostaBase(ctx, periodoDoInstante(ctx.agora)),
      cartoes,
      totais: {
        limiteCentavos: str(limite),
        utilizadoCentavos: str(utilizado),
        disponivelCentavos: str(limite - utilizado),
      },
    };
  }
}
