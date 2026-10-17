import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { LuX } from 'react-icons/lu'
import styles from './Dialog.module.css'

interface DialogProps {
  title: string
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'

/**
 * Modal de conteudo (formularios, detalhes). Foco preso no dialogo, Esc e clique
 * fora fecham, e o foco volta ao elemento de origem. Para confirmar acoes
 * destrutivas use o ConfirmDialog (alertdialog).
 */
export function Dialog({ title, onClose, children }: DialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    // Foco inicial no primeiro campo/acao do conteudo; se nao houver, no botao de fechar.
    const first = dialogRef.current?.querySelector<HTMLElement>(`[data-dialog-body] :is(${FOCUSABLE})`)
    ;(first ?? dialogRef.current?.querySelector<HTMLElement>('button'))?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
            <LuX aria-hidden="true" />
          </button>
        </header>
        <div data-dialog-body className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  )
}
