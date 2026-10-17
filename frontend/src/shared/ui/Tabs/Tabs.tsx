import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import styles from './Tabs.module.css'

export interface TabItem {
  id: string
  label: string
  panel: ReactNode
}

interface TabsProps {
  /** Nome acessivel do conjunto de abas. */
  label: string
  tabs: readonly TabItem[]
  /** Aba inicial (padrao: a primeira). */
  initialId?: string
}

/**
 * Abas acessiveis (padrao WAI-ARIA): setas, Home e End movem o foco e a
 * selecao; so a aba ativa fica no ciclo de Tab e so o painel ativo e renderizado.
 */
export function Tabs({ label, tabs, initialId }: TabsProps) {
  const baseId = useId()
  const [activeId, setActiveId] = useState(initialId ?? tabs[0].id)
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})

  function select(id: string) {
    setActiveId(id)
    buttons.current[id]?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === activeId)
    const last = tabs.length - 1
    const next: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }
    if (!(event.key in next)) return
    event.preventDefault()
    select(tabs[next[event.key]].id)
  }

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.id === active.id
          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttons.current[tab.id] = element
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={cn(styles.tab, selected && styles.tabActive)}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        className={styles.panel}
      >
        {active.panel}
      </div>
    </div>
  )
}
