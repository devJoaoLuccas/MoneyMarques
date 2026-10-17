import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import { cn } from '../../lib/cn'
import styles from './ActionMenu.module.css'

export interface ActionMenuItem {
  label: string
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

interface ActionMenuProps {
  /** Nome acessivel da lista de opcoes (ex.: "Acoes do convite para ana@exemplo.com"). */
  menuLabel: string
  items: readonly ActionMenuItem[]
  /** Conteudo clicavel (por exemplo, o card inteiro). */
  children: ReactNode
  /** Classe do botao que abre o menu, para ele herdar o visual do card. */
  triggerClassName?: string
}

/**
 * Botao com menu suspenso (padrao WAI-ARIA "menu button"): clique, Enter ou
 * Espaco abrem; setas, Home e End percorrem; Esc fecha e devolve o foco; clique
 * fora fecha. Ao escolher uma opcao o foco volta ao botao antes da acao rodar,
 * entao dialogos abertos pela acao devolvem o foco para ele ao fechar.
 */
export function ActionMenu({ menuLabel, items, children, triggerClassName }: ActionMenuProps) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const focusOnOpen = useRef<'first' | 'last'>('first')

  useEffect(() => {
    if (!open) return
    const enabled = itemRefs.current.filter((item): item is HTMLButtonElement => !!item && !item.disabled)
    ;(focusOnOpen.current === 'last' ? enabled.at(-1) : enabled[0])?.focus()

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function openWith(position: 'first' | 'last') {
    focusOnOpen.current = position
    setOpen(true)
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openWith('first')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openWith('last')
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const enabled = itemRefs.current.filter((item): item is HTMLButtonElement => !!item && !item.disabled)
    const index = enabled.findIndex((item) => item === document.activeElement)
    const move = (target: HTMLButtonElement | undefined) => {
      event.preventDefault()
      target?.focus()
    }
    switch (event.key) {
      case 'ArrowDown':
        return move(enabled[(index + 1) % enabled.length])
      case 'ArrowUp':
        return move(enabled[(index - 1 + enabled.length) % enabled.length])
      case 'Home':
        return move(enabled[0])
      case 'End':
        return move(enabled.at(-1))
      case 'Escape':
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
        return
      case 'Tab':
        setOpen(false)
    }
  }

  function select(item: ActionMenuItem) {
    setOpen(false)
    triggerRef.current?.focus()
    item.onSelect()
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(styles.trigger, triggerClassName)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setOpen(false) : openWith('first'))}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={styles.content}>{children}</span>
        <LuChevronDown aria-hidden="true" className={cn(styles.chevron, open && styles.chevronOpen)} />
      </button>
      {open && (
        <ul id={menuId} role="menu" aria-label={menuLabel} className={styles.menu} onKeyDown={onMenuKeyDown}>
          {items.map((item, index) => (
            <li key={item.label} role="none">
              <button
                ref={(element) => {
                  itemRefs.current[index] = element
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                className={cn(styles.item, item.destructive && styles.destructive)}
                onClick={() => select(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
