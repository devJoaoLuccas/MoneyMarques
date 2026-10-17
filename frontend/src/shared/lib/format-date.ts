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
