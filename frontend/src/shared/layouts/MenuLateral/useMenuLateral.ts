import { useCallback, useState } from 'react'

const chaveRecolhido = (usuarioUid: string) => `mm.menu.recolhido.${usuarioUid}`

function lerRecolhido(usuarioUid: string): boolean {
  try {
    return window.localStorage.getItem(chaveRecolhido(usuarioUid)) === '1'
  } catch {
    return false
  }
}

function gravarRecolhido(usuarioUid: string, recolhido: boolean): void {
  try {
    window.localStorage.setItem(chaveRecolhido(usuarioUid), recolhido ? '1' : '0')
  } catch {
    // Sem storage: a preferencia vale so ate recarregar.
  }
}

/**
 * Estado de UI do menu: modo compacto (preferencia por usuario, sem dado
 * sensivel) e drawer mobile (efemero).
 */
export function useMenuLateral(usuarioUid: string) {
  const [recolhido, setRecolhido] = useState(() => lerRecolhido(usuarioUid))
  const [drawerAberto, setDrawerAberto] = useState(false)

  const alternarRecolhido = useCallback(() => {
    setRecolhido((atual) => {
      gravarRecolhido(usuarioUid, !atual)
      return !atual
    })
  }, [usuarioUid])

  const abrirDrawer = useCallback(() => setDrawerAberto(true), [])
  const fecharDrawer = useCallback(() => setDrawerAberto(false), [])

  return {
    recolhido,
    alternarRecolhido,
    drawerAberto,
    abrirDrawer,
    fecharDrawer,
  }
}
