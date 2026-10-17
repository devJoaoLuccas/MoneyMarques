/** Valor de aria-describedby para um campo com ajuda e/ou erro. */
export function describedBy(ids: { hintId: string; errorId: string }, state: { hint?: string; error?: string }) {
  const parts = [state.hint && ids.hintId, state.error && ids.errorId].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : undefined
}
