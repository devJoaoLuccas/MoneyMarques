import { http } from '../../../shared/lib/http'
import type {
  Alertas,
  CartoesPainel,
  Patrimonio,
  Projecoes,
  ReceitasDespesas,
  ResumoFinanceiro,
  VisaoFinanceira,
  Vencimentos,
} from '../types'

export interface ConsultaPainel {
  visao: VisaoFinanceira
  periodo: string
  categoriaUid?: string
}

/** Tipos de resposta por recurso da API. */
export interface RecursosPainel {
  resumo: ResumoFinanceiro
  'receitas-despesas': ReceitasDespesas
  cartoes: CartoesPainel
  patrimonio: Patrimonio
  projecoes: Projecoes
  vencimentos: Vencimentos
  alertas: Alertas
}

export type RecursoPainel = keyof RecursosPainel

/** Unica porta de saida do modulo para a API do painel. Sem calculo: o servidor consolida. */
export const painelService = {
  async obter<R extends RecursoPainel>(
    familiaUid: string,
    recurso: R,
    { visao, periodo, categoriaUid }: ConsultaPainel,
  ): Promise<RecursosPainel[R]> {
    const { data } = await http.get<RecursosPainel[R]>(`/familias/${familiaUid}/painel/${recurso}`, {
      params: { visao, periodo, categoriaUid },
    })
    return data
  },

  obterResumo(familiaUid: string, visao: VisaoFinanceira, periodo: string): Promise<ResumoFinanceiro> {
    return painelService.obter(familiaUid, 'resumo', { visao, periodo })
  },
}
