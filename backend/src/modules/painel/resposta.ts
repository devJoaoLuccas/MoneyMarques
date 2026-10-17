import type { ContextoFinanceiro } from './politica-acesso-financeiro';
import type { RespostaPainelDto } from './painel.types';

/** Contrato comum de toda resposta do painel. */
export function respostaBase(
  ctx: ContextoFinanceiro,
  periodo: string,
): RespostaPainelDto {
  return {
    periodoReferencia: periodo,
    visao: ctx.visao,
    atualizadoEm: ctx.agora.toISOString(),
    moeda: 'BRL',
    indisponivel: false,
  };
}

export const str = (valor: bigint): string => valor.toString();
