import type { CSSProperties } from 'react'
import { Toaster as SonnerToaster } from 'sonner'

/** Cores do Design System: o sonner so le estas variaveis (nenhum valor solto). */
const tema = {
  '--normal-bg': 'var(--color-surface-secondary)',
  '--normal-text': 'var(--color-text-primary)',
  '--normal-border': 'var(--color-border)',
  '--success-bg': 'var(--color-surface-secondary)',
  '--success-text': 'var(--color-text-primary)',
  '--success-border': 'var(--color-positive)',
  '--error-bg': 'var(--color-surface-secondary)',
  '--error-text': 'var(--color-text-primary)',
  '--error-border': 'var(--color-negative)',
  '--info-bg': 'var(--color-surface-secondary)',
  '--info-text': 'var(--color-text-primary)',
  '--info-border': 'var(--color-info)',
  '--border-radius': 'var(--radius-card)',
  fontFamily: 'var(--font-sans)',
} as CSSProperties

/**
 * Toaster unico da aplicacao. O tipo (sucesso/erro/info) tambem vai por icone
 * e texto, nunca so por cor. Leitores de tela recebem o aviso (regiao aria-live).
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      richColors
      closeButton
      position="top-right"
      duration={5000}
      visibleToasts={3}
      style={tema}
      toastOptions={{ style: { fontSize: 'var(--font-size-text-small)' } }}
    />
  )
}
