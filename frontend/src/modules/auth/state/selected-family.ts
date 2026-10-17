const KEY = 'mm.selectedFamily'

/**
 * Familia escolhida na selecao de contexto (AUTH-005). E apenas preferencia de
 * navegacao da aba: nao e autorizacao e nao guarda nada sensivel (so um uid).
 * Usa sessionStorage (nunca localStorage) e tolera storage bloqueado.
 */
export function getSelectedFamily(): string | null {
  try {
    return window.sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setSelectedFamily(familyUid: string): void {
  try {
    window.sessionStorage.setItem(KEY, familyUid)
  } catch {
    // Sem storage: o usuario so precisara escolher de novo.
  }
}

export function clearSelectedFamily(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // Nada a limpar.
  }
}
