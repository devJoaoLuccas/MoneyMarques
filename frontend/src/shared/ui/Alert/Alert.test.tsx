import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Alert } from './Alert'

describe('Alert (FormAlert)', () => {
  it('erro usa role=alert (anunciado imediatamente)', () => {
    render(<Alert variant="error">Não foi possível entrar.</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível entrar.')
  })

  it('sucesso e informacao usam role=status (nao interrompem a leitura)', () => {
    render(<Alert variant="success">Senha alterada.</Alert>)
    expect(screen.getByRole('status')).toHaveTextContent('Senha alterada.')
  })

  it('nao comunica o estado apenas por cor: inclui rotulo textual do tipo', () => {
    render(<Alert variant="error">Falhou</Alert>)
    expect(screen.getByRole('alert')).toHaveTextContent(/erro/i)
  })

  it('mostra titulo opcional', () => {
    render(
      <Alert variant="info" title="Confirme seu e-mail">
        Enviamos um link.
      </Alert>,
    )
    expect(screen.getByText('Confirme seu e-mail')).toBeInTheDocument()
  })
})
