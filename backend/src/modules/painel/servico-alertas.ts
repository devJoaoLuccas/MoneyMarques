import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { somar } from './domain/indicadores';
import {
  chaveDataCivil,
  deslocarPeriodo,
  janelaDoMes,
  periodoDoInstante,
  primeiroDiaCivil,
} from './domain/periodo';
import type { ContextoFinanceiro } from './politica-acesso-financeiro';
import { RepositorioFinanceiro } from './repositorio-financeiro';
import { respostaBase } from './resposta';
import { ServicoProjecoes } from './servico-projecoes';
import { ServicoVencimentos } from './servico-vencimentos';
import type { AlertaDto, AlertasDto, TipoAlerta } from './painel.types';

const DIAS_VENCIMENTO_PROXIMO = 3;
const DIAS_FATURA_PROXIMA = 5;
const MESES_PROJECAO_ALERTA = 3;
const LIMITE_ALERTAS = 50;
const DIA_MS = 24 * 60 * 60 * 1000;

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
/** So para texto de alerta (nunca soma): centavos inteiros -> reais com 2 casas. */
const dinheiro = (centavos: bigint) => brl.format(Number(centavos) / 100);
const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/**
 * Alertas do MVP (RF-015), calculados na hora a partir dos mesmos dados
 * autorizados do painel: vencimento proximo, conta vencida, projecao negativa,
 * orcamento excedido e fatura proxima. Respeita as preferencias do usuario.
 * Nao persiste nada: o envio/notificacao fica para o modulo de alertas.
 */
@Injectable()
export class ServicoAlertas {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RepositorioFinanceiro,
    private readonly vencimentos: ServicoVencimentos,
    private readonly projecoes: ServicoProjecoes,
  ) {}

  async obter(ctx: ContextoFinanceiro): Promise<AlertasDto> {
    const periodo = periodoDoInstante(ctx.agora);
    const hoje = chaveDataCivil(ctx.hojeCivil);
    const limite = (dias: number) =>
      chaveDataCivil(new Date(ctx.hojeCivil.getTime() + dias * DIA_MS));

    const [compromissos, projecao, orcamentos, desativados] = await Promise.all(
      [
        this.vencimentos.listar(ctx, periodo),
        this.projecoes.obter(ctx),
        this.alertasOrcamento(ctx, periodo),
        this.prisma.preferenciaAlerta.findMany({
          where: { usuarioUid: ctx.usuarioUid, ativo: false },
          select: { tipo: true },
        }),
      ],
    );

    const alertas: AlertaDto[] = [];
    const add = (
      tipo: TipoAlerta,
      gravidade: AlertaDto['gravidade'],
      descricao: string,
    ) => alertas.push({ tipo, gravidade, descricao });

    for (const c of compromissos) {
      if (c.tipo === 'RECEITA' || c.status === 'pago') continue;
      const valor = dinheiro(BigInt(c.valorCentavos));
      if (c.status === 'vencido') {
        add(
          'conta_vencida',
          'CRITICO',
          `${c.descricao} (${valor}) venceu em ${dataBr(c.vencimento)}.`,
        );
      } else if (
        c.tipo === 'FATURA' &&
        c.vencimento <= limite(DIAS_FATURA_PROXIMA)
      ) {
        add(
          'fatura_proxima',
          'ATENCAO',
          `${c.descricao} (${valor}) vence em ${dataBr(c.vencimento)}.`,
        );
      } else if (
        c.tipo === 'DESPESA' &&
        c.vencimento <= limite(DIAS_VENCIMENTO_PROXIMO) &&
        c.vencimento >= hoje
      ) {
        add(
          'vencimento_proximo',
          'ATENCAO',
          `${c.descricao} (${valor}) vence em ${dataBr(c.vencimento)}.`,
        );
      }
    }

    const negativo = projecao.meses
      .slice(0, MESES_PROJECAO_ALERTA)
      .find((m) => BigInt(m.saldoFinalCentavos) < 0n);
    if (
      projecao.menorSaldoMesAtual &&
      BigInt(projecao.menorSaldoMesAtual.saldoCentavos) < 0n
    ) {
      add(
        'projecao_negativa',
        'CRITICO',
        `O saldo previsto fica negativo em ${dataBr(projecao.menorSaldoMesAtual.data)} (${dinheiro(BigInt(projecao.menorSaldoMesAtual.saldoCentavos))}).`,
      );
    } else if (negativo) {
      add(
        'projecao_negativa',
        'CRITICO',
        `O saldo previsto para ${negativo.periodo} é negativo.`,
      );
    }
    alertas.push(...orcamentos);

    const off = new Set(desativados.map((d) => d.tipo));
    return {
      ...respostaBase(ctx, periodo),
      alertas: alertas.filter((a) => !off.has(a.tipo)).slice(0, LIMITE_ALERTAS),
    };
  }

  /** Orcamento excedido: realizado (liquidacoes + parcelas) da categoria no mes > limite. */
  private async alertasOrcamento(
    ctx: ContextoFinanceiro,
    periodo: string,
  ): Promise<AlertaDto[]> {
    const escopoUid =
      ctx.visao === 'pessoal' ? ctx.usuarioUid : ctx.scope.familiaUid;
    const candidatos = await this.prisma.orcamentoCategoria.findMany({
      where: {
        situacao: 'ATIVO',
        escopo: ctx.escopoOrcamento,
        escopoUid,
        competencia: primeiroDiaCivil(periodo),
        ...(ctx.visao === 'pessoal' ? { titularUid: ctx.usuarioUid } : {}),
      },
      select: {
        uid: true,
        titularUid: true,
        categoriaUid: true,
        limiteCentavos: true,
        categoria: {
          select: { nome: true, titularUid: true, visibilidade: true },
        },
      },
    });
    if (candidatos.length === 0) return [];

    // Familiar: so o que e do usuario ou tem concessao ativa de leitura (ACL ORCAMENTO).
    let visiveis = candidatos;
    if (ctx.visao === 'familiar') {
      const grants = await this.prisma.permissaoRecursoFamilia.findMany({
        where: {
          familiaUid: ctx.scope.familiaUid,
          usuarioUid: ctx.usuarioUid,
          tipoRecurso: 'ORCAMENTO',
          recursoUid: { in: candidatos.map((o) => o.uid) },
          revogadaEm: null,
          podeVisualizar: true,
        },
        select: { recursoUid: true },
      });
      const liberados = new Set(grants.map((g) => g.recursoUid));
      visiveis = candidatos.filter(
        (o) => o.titularUid === ctx.usuarioUid || liberados.has(o.uid),
      );
    }
    if (visiveis.length === 0) return [];

    const janela = janelaDoMes(periodo);
    const [liquidacoes, parcelas] = await Promise.all([
      this.repo.liquidacoes(ctx, janela.inicio, janela.fimExclusivo),
      this.repo.parcelasReconhecidas(
        ctx,
        primeiroDiaCivil(periodo),
        primeiroDiaCivil(deslocarPeriodo(periodo, 1)),
      ),
    ]);
    const gasto = (categoriaUid: string) =>
      somar([
        ...liquidacoes
          .filter(
            (l) =>
              l.lancamento.tipo === 'DESPESA' &&
              l.lancamento.categoriaUid === categoriaUid,
          )
          .map((l) => l.valorCentavos),
        ...parcelas
          .filter((p) => p.compra.categoriaUid === categoriaUid)
          .map((p) => p.valorCentavos),
      ]);

    return visiveis
      .filter(
        (o) =>
          o.limiteCentavos > 0n && gasto(o.categoriaUid) > o.limiteCentavos,
      )
      .map((o) => {
        const nome =
          o.categoria.visibilidade === 'PRIVADO' &&
          o.categoria.titularUid !== ctx.usuarioUid
            ? 'uma categoria'
            : o.categoria.nome;
        return {
          tipo: 'orcamento_excedido' as const,
          gravidade: 'ATENCAO' as const,
          descricao: `O orçamento de ${nome} foi excedido: ${dinheiro(gasto(o.categoriaUid))} de ${dinheiro(o.limiteCentavos)}.`,
        };
      });
  }
}
