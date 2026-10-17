const formatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

/** DD/MM/AAAA (formato do produto). Datas vem do servidor em UTC (ISO 8601). */
export function formatDate(iso: string): string {
  return formatter.format(new Date(iso))
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bahia',
})

/** DD/MM/AAAA HH:mm no fuso da interface (America/Bahia); instantes vem do servidor em UTC. */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso)).replace(',', '')
}
