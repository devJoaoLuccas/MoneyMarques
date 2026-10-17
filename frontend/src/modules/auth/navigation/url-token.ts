/**
 * Os links de e-mail levam o token no fragmento (#token=...): ele nao e enviado
 * a servidores, logs nem ao cabecalho Referer (AUTH-003). Devolve null se nao houver.
 */
export function readTokenFromHash(hash: string): string | null {
  if (!hash.startsWith('#')) return null
  return new URLSearchParams(hash.slice(1)).get('token') || null
}
