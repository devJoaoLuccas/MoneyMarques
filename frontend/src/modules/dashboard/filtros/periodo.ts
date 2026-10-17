const FUSO = 'America/Bahia'
const FORMATO = /^(\d{4})-(0[1-9]|1[0-2])$/

const partesLocais = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
})

/** Mes civil atual na interface (America/Bahia), no formato `AAAA-MM`. */
export function periodoAtual(agora: Date = new Date()): string {
  const partes = partesLocais.formatToParts(agora)
  const ano = partes.find((parte) => parte.type === 'year')?.value
  const mes = partes.find((parte) => parte.type === 'month')?.value
  return `${ano}-${mes}`
}

export function periodoValido(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && FORMATO.test(valor)
}

export function deslocarPeriodo(periodo: string, meses: number): string {
  const [ano, mes] = periodo.split('-').map(Number)
  const indice = ano * 12 + (mes - 1) + meses
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`
}

const NOMES_MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** "Outubro de 2026". */
export function rotuloPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-').map(Number)
  const nome = NOMES_MESES[mes - 1]
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`
}

/** "out/26" (eixos de grafico). */
export function rotuloPeriodoCurto(periodo: string): string {
  const [ano, mes] = periodo.split('-').map(Number)
  return `${NOMES_MESES[mes - 1].slice(0, 3)}/${String(ano).slice(2)}`
}

/** `AAAA-MM-DD` para `DD/MM/AAAA` (formato do produto), sem passar por fuso. */
export function formatarDataCivil(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

const partesDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Dia civil (`AAAA-MM-DD`) de um instante, no fuso da interface (America/Bahia). */
export function dataCivilDe(instante: Date): string {
  const partes = partesDia.formatToParts(instante)
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value
  return `${valor('year')}-${valor('month')}-${valor('day')}`
}
