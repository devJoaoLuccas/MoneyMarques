import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { TextField } from './TextField'

describe('TextField', () => {
  it('associa o label ao campo', () => {
    render(<TextField label="E-mail" />)
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('repassa atributos nativos (type, autoComplete) e a ref', () => {
    const ref = createRef<HTMLInputElement>()
    render(<TextField ref={ref} label="E-mail" type="email" autoComplete="username" />)
    const input = screen.getByLabelText('E-mail')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('autocomplete', 'username')
    expect(ref.current).toBe(input)
  })

  it('mostra o erro associado ao campo via aria-describedby e marca como invalido', () => {
    render(<TextField label="E-mail" error="Informe um e-mail válido." />)
    const input = screen.getByLabelText('E-mail')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const message = screen.getByText('Informe um e-mail válido.')
    expect(input.getAttribute('aria-describedby')).toContain(message.id)
  })

  it('o erro e anunciado para leitores de tela', () => {
    render(<TextField label="E-mail" error="Obrigatório." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório.')
  })

  it('mostra texto de ajuda associado ao campo', () => {
    render(<TextField label="Senha" hint="Mínimo de 12 caracteres." />)
    const input = screen.getByLabelText('Senha')
    expect(input.getAttribute('aria-describedby')).toContain(screen.getByText('Mínimo de 12 caracteres.').id)
    expect(input).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('aceita digitacao', async () => {
    render(<TextField label="Nome" />)
    const input = screen.getByLabelText('Nome')
    await userEvent.setup().type(input, 'Ana')
    expect(input).toHaveValue('Ana')
  })
})
