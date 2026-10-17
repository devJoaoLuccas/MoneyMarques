import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PasswordField } from './PasswordField'

describe('PasswordField (CA-003)', () => {
  it('comeca oculto (type=password) e associa o label', () => {
    render(<PasswordField label="Senha" />)
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
  })

  it('alterna mostrar/ocultar sem alterar o valor digitado', async () => {
    const user = userEvent.setup()
    render(<PasswordField label="Senha" />)
    const input = screen.getByLabelText('Senha')
    await user.type(input, 'segredo 123')

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('segredo 123')

    const hide = screen.getByRole('button', { name: 'Ocultar senha' })
    expect(hide).toHaveAttribute('aria-pressed', 'true')
    await user.click(hide)
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveValue('segredo 123')
  })

  it('o botao de alternar nao envia o formulario', async () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <PasswordField label="Senha" />
      </form>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('permite preenchimento automatico e nao bloqueia a colagem', () => {
    render(<PasswordField label="Senha" autoComplete="current-password" />)
    const input = screen.getByLabelText('Senha')
    expect(input).toHaveAttribute('autocomplete', 'current-password')
    expect(input).not.toHaveAttribute('onpaste')
  })

  it('exibe erro associado ao campo', () => {
    render(<PasswordField label="Senha" error="Informe sua senha." />)
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Informe sua senha.')
  })
})
