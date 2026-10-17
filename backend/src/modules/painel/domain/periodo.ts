/**
 * Periodos do painel: mes civil na interface em America/Bahia (UTC-3, sem
 * horario de verao). Instantes sao guardados em UTC; datas civis (@db.Date)
 * sao comparadas como meia-noite UTC do dia civil.
 */
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
const FORMATO = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function periodoValido(periodo: string): boolean {
  return FORMATO.test(periodo);
}

function partes(periodo: string): { ano: number; mes: number } {
  const match = FORMATO.exec(periodo);
  if (!match) throw new Error(`Periodo invalido: ${periodo}`);
  return { ano: Number(match[1]), mes: Number(match[2]) };
}

function formatar(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

/** Meia-noite local do primeiro dia do mes, como instante UTC. */
function inicioLocal(ano: number, mes: number): Date {
  return new Date(Date.UTC(ano, mes - 1, 1) + OFFSET_MS);
}

export interface JanelaMes {
  inicio: Date;
  fimExclusivo: Date;
}

export function deslocarPeriodo(periodo: string, meses: number): string {
  const { ano, mes } = partes(periodo);
  const indice = ano * 12 + (mes - 1) + meses;
  return formatar(Math.floor(indice / 12), (indice % 12) + 1);
}

export function janelaDoMes(periodo: string): JanelaMes {
  const { ano, mes } = partes(periodo);
  const proximo = partes(deslocarPeriodo(periodo, 1));
  return {
    inicio: inicioLocal(ano, mes),
    fimExclusivo: inicioLocal(proximo.ano, proximo.mes),
  };
}

/** Do mais antigo ao mais recente, terminando em `periodo`. */
export function ultimosPeriodos(periodo: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) =>
    deslocarPeriodo(periodo, i - (quantidade - 1)),
  );
}

export function periodoDoInstante(instante: Date): string {
  const local = new Date(instante.getTime() - OFFSET_MS);
  return formatar(local.getUTCFullYear(), local.getUTCMonth() + 1);
}

/** Dia civil local como meia-noite UTC (comparavel a colunas `@db.Date`). */
export function dataCivilLocal(instante: Date): Date {
  const local = new Date(instante.getTime() - OFFSET_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
  );
}

/** Ultimo dia civil do periodo (meia-noite UTC), para comparar com `@db.Date`. */
export function ultimoDiaCivil(periodo: string): Date {
  const { fimExclusivo } = janelaDoMes(periodo);
  return new Date(fimExclusivo.getTime() - OFFSET_MS - DIA_MS);
}

/** Instante em que o dia civil (meia-noite UTC de uma coluna `@db.Date`) comeca no fuso local. */
export function inicioDoDiaCivil(dataCivil: Date): Date {
  return new Date(dataCivil.getTime() + OFFSET_MS);
}

/** Periodo (`AAAA-MM`) de uma data civil de coluna `@db.Date` (meia-noite UTC), sem aplicar fuso. */
export function periodoDaDataCivil(dataCivil: Date): string {
  return formatar(dataCivil.getUTCFullYear(), dataCivil.getUTCMonth() + 1);
}

/** `AAAA-MM-DD` de uma data civil de coluna `@db.Date`. */
export function chaveDataCivil(dataCivil: Date): string {
  return dataCivil.toISOString().slice(0, 10);
}

/** Primeiro dia civil do periodo (meia-noite UTC). */
export function primeiroDiaCivil(periodo: string): Date {
  const { ano, mes } = partes(periodo);
  return new Date(Date.UTC(ano, mes - 1, 1));
}
