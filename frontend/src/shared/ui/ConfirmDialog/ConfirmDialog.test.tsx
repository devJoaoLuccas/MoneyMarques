import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog
      title="Remover integrante"
      confirmLabel="Remover"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    >
      <p>Isto remove o acesso.</p>
    </ConfirmDialog>,
  )
  return { onConfirm, onCancel }
}

describe('ConfirmDialog', () => {
  it('e um alertdialog nomeado e descrito, com foco inicial em Cancelar', () => {
    setup()
    const dialog = screen.getByRole('alertdialog', { name: 'Remover integrante' })
    expect(dialog).toHaveAccessibleDescription('Isto remove o acesso.')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('confirma e cancela pelos botoes', async () => {
    const { onConfirm, onCancel } = setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Remover' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Esc cancela, exceto durante o carregamento', async () => {
    const first = setup()
    await userEvent.setup().keyboard('{Escape}')
    expect(first.onCancel).toHaveBeenCalledTimes(1)
  })

  it('Esc e ignorado enquanto carrega', async () => {
    const { onCancel } = setup({ loading: true })
    await userEvent.setup().keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('mantem o foco preso no dialogo (Tab circula entre os botoes)', async () => {
    setup()
    const user = userEvent.setup()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Remover' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Remover' })).toHaveFocus()
  })
})
