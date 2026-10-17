import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { TipoRecursoFinanceiro } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { ResourceGrant } from '../family/domain/access-policy';
import type { FamilyScope } from '../family/guards/family-context.guard';
import { dataCivilLocal } from './domain/periodo';
import {
  selecionarRecursosVisiveis,
  type RecursoCandidato,
  type VisaoFinanceira,
} from './domain/recursos-visiveis';

export interface ContaVisivel extends RecursoCandidato {
  saldoInicialCentavos: bigint;
  dataSaldoInicial: Date;
}

export interface PosicaoVisivel extends RecursoCandidato {
  valorReferenciaCentavos: bigint;
  dataReferencia: Date | null;
  instituicao: string;
  classe: string;
}

export interface CartaoVisivel extends RecursoCandidato {
  nome: string;
  emissor: string | null;
  bandeira: string | null;
  identificadorMascarado: string | null;
  limiteCentavos: bigint;
  diaFechamento: number;
  diaVencimento: number;
  situacao: 'ATIVO' | 'BLOQUEADO';
}

/**
 * Tudo o que ja foi autorizado para esta requisicao. Montado uma vez (sem
 * cache entre requisicoes) e passado aos servicos: nenhum deles consulta
 * recurso financeiro que nao esteja aqui.
 */
export interface ContextoFinanceiro {
  scope: FamilyScope;
  usuarioUid: string;
  visao: VisaoFinanceira;
  agora: Date;
  hojeCivil: Date;
  contas: ContaVisivel[];
  posicoes: PosicaoVisivel[];
  cartoes: CartaoVisivel[];
  filtroLancamento: Prisma.LancamentoFinanceiroWhereInput;
  escopoOrcamento: 'PESSOAL' | 'FAMILIAR';
}

/**
 * PoliticaAcessoFinanceiro: decide, no servidor e por requisicao (sem cache de
 * decisao), quais recursos-raiz entram nas agregacoes do painel. A autorizacao
 * vem antes da soma: o painel nunca soma tudo para filtrar depois.
 */
@Injectable()
export class PoliticaAcessoFinanceiro {
  constructor(private readonly prisma: PrismaService) {}

  async carregarContexto(
    scope: FamilyScope,
    usuarioUid: string,
    visao: VisaoFinanceira,
    agora: Date = new Date(),
  ): Promise<ContextoFinanceiro> {
    const [contas, posicoes, cartoes] = await Promise.all([
      this.contasVisiveis(scope, usuarioUid, visao),
      this.posicoesVisiveis(scope, usuarioUid, visao),
      this.cartoesVisiveis(scope, usuarioUid, visao),
    ]);
    return {
      scope,
      usuarioUid,
      visao,
      agora,
      hojeCivil: dataCivilLocal(agora),
      contas,
      posicoes,
      cartoes,
      filtroLancamento: this.filtroLancamento(scope, usuarioUid, visao),
      escopoOrcamento: visao === 'pessoal' ? 'PESSOAL' : 'FAMILIAR',
    };
  }

  /**
   * Lancamentos que entram na visao. Pessoal: so os do titular com orcamento
   * pessoal. Familiar: so os de orcamento familiar compartilhados (a despesa
   * compartilhada conta uma vez, no orcamento da familia). RESTRITO fica de
   * fora: a permissao e concedida sobre a conta, nao sobre o lancamento.
   */
  private filtroLancamento(
    scope: FamilyScope,
    usuarioUid: string,
    visao: VisaoFinanceira,
  ): Prisma.LancamentoFinanceiroWhereInput {
    return visao === 'pessoal'
      ? {
          titularUid: usuarioUid,
          escopoOrcamento: 'PESSOAL',
          OR: [{ familiaUid: null }, { familiaUid: scope.familiaUid }],
        }
      : {
          familiaUid: scope.familiaUid,
          escopoOrcamento: 'FAMILIAR',
          visibilidade: 'COMPARTILHADO',
        };
  }

  /** Candidatos: pessoal = do titular (na familia ou sem familia); familiar = da familia e nao privados. */
  private ondeRecurso(
    scope: FamilyScope,
    usuarioUid: string,
    visao: VisaoFinanceira,
  ) {
    return visao === 'pessoal'
      ? {
          titularUid: usuarioUid,
          OR: [{ familiaUid: null }, { familiaUid: scope.familiaUid }],
        }
      : {
          familiaUid: scope.familiaUid,
          visibilidade: { not: 'PRIVADO' as const },
        };
  }

  async contasVisiveis(
    scope: FamilyScope,
    usuarioUid: string,
    visao: VisaoFinanceira,
  ): Promise<ContaVisivel[]> {
    const candidatas = await this.prisma.contaFinanceira.findMany({
      where: {
        situacao: 'ATIVA',
        ...this.ondeRecurso(scope, usuarioUid, visao),
      },
      select: {
        uid: true,
        titularUid: true,
        visibilidade: true,
        saldoInicialCentavos: true,
        dataSaldoInicial: true,
      },
    });
    return selecionarRecursosVisiveis({
      recursos: candidatas,
      usuarioUid,
      papel: scope.papel,
      visao,
      concessoes: await this.concessoes(
        scope,
        usuarioUid,
        'CONTA',
        candidatas,
        visao,
      ),
    });
  }

  async posicoesVisiveis(
    scope: FamilyScope,
    usuarioUid: string,
    visao: VisaoFinanceira,
  ): Promise<PosicaoVisivel[]> {
    const candidatas = await this.prisma.posicaoInvestimento.findMany({
      where: {
        situacao: 'ATIVA',
        valorReferenciaCentavos: { not: null },
        ...this.ondeRecurso(scope, usuarioUid, visao),
      },
      select: {
        uid: true,
        titularUid: true,
        visibilidade: true,
        valorReferenciaCentavos: true,
        dataReferencia: true,
        instituicao: { select: { nome: true } },
        classe: { select: { nome: true } },
      },
    });
    const visiveis = selecionarRecursosVisiveis({
      recursos: candidatas,
      usuarioUid,
      papel: scope.papel,
      visao,
      concessoes: await this.concessoes(
        scope,
        usuarioUid,
        'POSICAO_INVESTIMENTO',
        candidatas,
        visao,
      ),
    });
    return visiveis.map((p) => ({
      uid: p.uid,
      titularUid: p.titularUid,
      visibilidade: p.visibilidade,
      valorReferenciaCentavos: p.valorReferenciaCentavos as bigint,
      dataReferencia: p.dataReferencia,
      instituicao: p.instituicao.nome,
      classe: p.classe.nome,
    }));
  }

  async cartoesVisiveis(
    scope: FamilyScope,
    usuarioUid: string,
    visao: VisaoFinanceira,
  ): Promise<CartaoVisivel[]> {
    const candidatos = await this.prisma.cartaoCredito.findMany({
      where: {
        situacao: { in: ['ATIVO', 'BLOQUEADO'] },
        ...this.ondeRecurso(scope, usuarioUid, visao),
      },
      select: {
        uid: true,
        titularUid: true,
        visibilidade: true,
        nome: true,
        emissor: true,
        bandeira: true,
        identificadorMascarado: true,
        limiteCentavos: true,
        diaFechamento: true,
        diaVencimento: true,
        situacao: true,
      },
    });
    const visiveis = selecionarRecursosVisiveis({
      recursos: candidatos,
      usuarioUid,
      papel: scope.papel,
      visao,
      concessoes: await this.concessoes(
        scope,
        usuarioUid,
        'CARTAO',
        candidatos,
        visao,
      ),
    });
    return visiveis.map((c) => ({
      ...c,
      situacao: c.situacao as 'ATIVO' | 'BLOQUEADO',
    }));
  }

  /** Concessoes ativas (nao revogadas) do usuario; so relevantes na visao familiar. */
  private async concessoes(
    scope: FamilyScope,
    usuarioUid: string,
    tipoRecurso: TipoRecursoFinanceiro,
    recursos: { uid: string }[],
    visao: VisaoFinanceira,
  ): Promise<Map<string, ResourceGrant>> {
    if (visao === 'pessoal' || recursos.length === 0) return new Map();
    const linhas = await this.prisma.permissaoRecursoFamilia.findMany({
      where: {
        familiaUid: scope.familiaUid,
        usuarioUid,
        tipoRecurso,
        recursoUid: { in: recursos.map((r) => r.uid) },
        revogadaEm: null,
      },
    });
    return new Map(linhas.map((l) => [l.recursoUid, l]));
  }
}
