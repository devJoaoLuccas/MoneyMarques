import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      {open && (
        <Dialog
          title="Detalhes"
          onClose={() => {
            onClose()
            setOpen(false)
          }}
        >
          <label>
            Nome <input />
          </label>
          <button>Salvar</button>
        </Dialog>
      )}
    </>
  )
}

describe('Dialog', () => {
  it('e um dialog modal nomeado, com foco inicial no primeiro campo', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(screen.getByRole('dialog', { name: 'Detalhes' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByLabelText('Nome')).toHaveFocus()
  })

  it('Esc fecha e devolve o foco a quem abriu', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const abrir = screen.getByRole('button', { name: 'Abrir' })
    await userEvent.click(abrir)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  it('botao Fechar e clique fora fecham; clique dentro nao', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('dialog'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Tab nao escapa do dialogo', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 10; i++) await user.tab()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    for (let i = 0; i < 10; i++) await user.tab({ shift: true })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })
})
