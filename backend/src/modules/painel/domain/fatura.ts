import { somar } from './indicadores';

export type TipoAjuste = 'CREDITO' | 'DEBITO' | 'ESTORNO';

export interface EntradaFatura {
  /** Parcelas de compras ATIVAS (a compra cancelada/estornada ja fica de fora na consulta). */
  parcelas: readonly bigint[];
  ajustes: readonly { tipo: TipoAjuste; valorCentavos: bigint }[];
  /** Pagamentos CONFIRMADOS (estornados nao entram). */
  pagamentos: readonly bigint[];
}

/**
 * Valor da fatura (nao e coluna): parcelas + debitos - creditos - estornos.
 * Premissa: DEBITO aumenta a fatura; CREDITO e ESTORNO a reduzem (o schema nao
 * detalha o sinal; adotado o sentido natural de cada tipo).
 */
export function totalFatura({ parcelas, ajustes }: EntradaFatura): bigint {
  const debitos = somar(
    ajustes.filter((a) => a.tipo === 'DEBITO').map((a) => a.valorCentavos),
  );
  const abatimentos = somar(
    ajustes.filter((a) => a.tipo !== 'DEBITO').map((a) => a.valorCentavos),
  );
  return somar(parcelas) + debitos - abatimentos;
}

/** O que ainda falta pagar; nunca negativo (pagamento a maior nao vira credito aqui). */
export function saldoDevedorFatura(entrada: EntradaFatura): bigint {
  const restante = totalFatura(entrada) - somar(entrada.pagamentos);
  return restante > 0n ? restante : 0n;
}

export type StatusCompromisso = 'previsto' | 'pendente' | 'pago' | 'vencido';

/** `vencimento` e `hoje` em data civil (`AAAA-MM-DD`): comparacao de texto e segura nesse formato. */
function vencido(vencimento: string, hoje: string): boolean {
  return vencimento < hoje;
}

export function statusLancamento(
  situacao:
    | 'PREVISTO'
    | 'PENDENTE'
    | 'PARCIALMENTE_LIQUIDADO'
    | 'LIQUIDADO'
    | 'CANCELADO',
  vencimento: string,
  hoje: string,
): StatusCompromisso {
  if (situacao === 'LIQUIDADO') return 'pago';
  if (vencido(vencimento, hoje)) return 'vencido';
  return situacao === 'PREVISTO' ? 'previsto' : 'pendente';
}

export function statusFatura(
  situacao: 'ABERTA' | 'FECHADA' | 'PARCIALMENTE_PAGA' | 'PAGA' | 'CANCELADA',
  vencimento: string,
  hoje: string,
): StatusCompromisso {
  if (situacao === 'PAGA') return 'pago';
  if (vencido(vencimento, hoje)) return 'vencido';
  return situacao === 'ABERTA' ? 'previsto' : 'pendente';
}
