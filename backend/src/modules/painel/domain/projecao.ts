import {
  chaveDataCivil,
  deslocarPeriodo,
  periodoDaDataCivil,
  primeiroDiaCivil,
  ultimoDiaCivil,
} from './periodo';

/** Entrada ou saida PREVISTA (nunca realizada) numa data civil (meia-noite UTC). */
export interface MovimentoPrevisto {
  data: Date;
  tipo: 'entrada' | 'saida';
  /** Sempre positivo; o sentido vem de `tipo`. */
  valorCentavos: bigint;
}

export interface ProjecaoMensal {
  periodo: string;
  saldoInicialCentavos: bigint;
  entradasPrevistasCentavos: bigint;
  saidasPrevistasCentavos: bigint;
  /** saldoInicial + entradas previstas - saidas previstas. */
  saldoFinalCentavos: bigint;
}

/**
 * Projecao mensal. O saldo final de um mes e o saldo inicial do seguinte.
 * Item previsto com data anterior ao primeiro mes (atrasado) cai no primeiro
 * mes: continua sendo dinheiro que ainda vai se mover.
 */
export function projetarMeses(
  saldoInicialCentavos: bigint,
  movimentos: readonly MovimentoPrevisto[],
  periodoInicial: string,
  quantidade: number,
): ProjecaoMensal[] {
  const resultado: ProjecaoMensal[] = [];
  let saldo = saldoInicialCentavos;
  for (let i = 0; i < quantidade; i++) {
    const periodo = deslocarPeriodo(periodoInicial, i);
    let entradas = 0n;
    let saidas = 0n;
    for (const m of movimentos) {
      const periodoDoItem = periodoDaDataCivil(m.data);
      const noMes =
        i === 0 ? periodoDoItem <= periodo : periodoDoItem === periodo;
      if (!noMes) continue;
      if (m.tipo === 'entrada') entradas += m.valorCentavos;
      else saidas += m.valorCentavos;
    }
    const saldoFinal = saldo + entradas - saidas;
    resultado.push({
      periodo,
      saldoInicialCentavos: saldo,
      entradasPrevistasCentavos: entradas,
      saidasPrevistasCentavos: saidas,
      saldoFinalCentavos: saldoFinal,
    });
    saldo = saldoFinal;
  }
  return resultado;
}

export interface DiaFluxo {
  /** `AAAA-MM-DD`. */
  data: string;
  entradasPrevistasCentavos: bigint;
  saidasPrevistasCentavos: bigint;
  /** Saldo ao fim do dia, acumulado a partir do saldo de hoje. */
  saldoCentavos: bigint;
}

/**
 * Fluxo de caixa DIARIO de hoje ate o fim do mes (diferente do saldo final
 * mensal: mostra o menor saldo no meio do mes). Atrasados contam em `hoje`.
 */
export function fluxoDiario(
  saldoHojeCentavos: bigint,
  movimentos: readonly MovimentoPrevisto[],
  hoje: Date,
  periodo: string,
): DiaFluxo[] {
  const ultimo = ultimoDiaCivil(periodo);
  const inicio =
    hoje > primeiroDiaCivil(periodo) ? hoje : primeiroDiaCivil(periodo);
  const porDia = new Map<string, { entradas: bigint; saidas: bigint }>();
  for (const m of movimentos) {
    if (m.data > ultimo) continue;
    const chave = chaveDataCivil(m.data < inicio ? inicio : m.data);
    const dia = porDia.get(chave) ?? { entradas: 0n, saidas: 0n };
    if (m.tipo === 'entrada') dia.entradas += m.valorCentavos;
    else dia.saidas += m.valorCentavos;
    porDia.set(chave, dia);
  }
  const dias: DiaFluxo[] = [];
  let saldo = saldoHojeCentavos;
  for (
    let d = new Date(inicio);
    d <= ultimo;
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const chave = chaveDataCivil(d);
    const dia = porDia.get(chave) ?? { entradas: 0n, saidas: 0n };
    saldo = saldo + dia.entradas - dia.saidas;
    dias.push({
      data: chave,
      entradasPrevistasCentavos: dia.entradas,
      saidasPrevistasCentavos: dia.saidas,
      saldoCentavos: saldo,
    });
  }
  return dias;
}

/** Dia de menor saldo (primeiro em caso de empate); nulo sem dias. */
export function menorSaldo(dias: readonly DiaFluxo[]): DiaFluxo | null {
  return dias.reduce<DiaFluxo | null>(
    (menor, d) =>
      menor === null || d.saldoCentavos < menor.saldoCentavos ? d : menor,
    null,
  );
}
