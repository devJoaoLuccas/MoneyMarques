import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActionMenu } from './ActionMenu'

function setup() {
  const onResend = vi.fn()
  const onRevoke = vi.fn()
  render(
    <>
      <ActionMenu
        menuLabel="Ações do convite"
        items={[
          { label: 'Reenviar', onSelect: onResend },
          { label: 'Revogar', onSelect: onRevoke, destructive: true },
        ]}
      >
        Cartão do convite
      </ActionMenu>
      <button>Fora</button>
    </>,
  )
  return { onResend, onRevoke, trigger: screen.getByRole('button', { name: /cartão do convite/i }) }
}

describe('ActionMenu', () => {
  it('abre ao clicar no conteudo, com aria-haspopup/expanded e o foco na primeira opcao', async () => {
    const { trigger } = setup()
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu', { name: 'Ações do convite' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Reenviar' })).toHaveFocus()
  })

  it('escolher uma opcao fecha o menu, devolve o foco ao botao e roda a acao', async () => {
    const { trigger, onRevoke } = setup()
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Revogar' }))
    expect(onRevoke).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('setas, Home e End percorrem as opcoes com volta nas pontas', async () => {
    const { trigger } = setup()
    const user = userEvent.setup()
    await user.click(trigger)
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Revogar' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Reenviar' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Revogar' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('menuitem', { name: 'Reenviar' })).toHaveFocus()
  })

  it('Esc fecha e devolve o foco; seta para baixo no botao abre', async () => {
    const { trigger } = setup()
    const user = userEvent.setup()
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('seta para cima no botao abre na ultima opcao', async () => {
    const { trigger } = setup()
    trigger.focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Revogar' })).toHaveFocus()
  })

  it('clique fora e Tab fecham', async () => {
    const { trigger } = setup()
    const user = userEvent.setup()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Fora' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(trigger)
    await user.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('clicar de novo no botao fecha', async () => {
    const { trigger } = setup()
    await userEvent.click(trigger)
    await userEvent.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
