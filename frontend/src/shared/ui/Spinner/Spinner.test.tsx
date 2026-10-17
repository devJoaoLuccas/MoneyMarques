import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingIndicator } from './Spinner'

describe('LoadingIndicator', () => {
  it('anuncia o carregamento por role=status com rotulo acessivel', () => {
    render(<LoadingIndicator label="Verificando sessão" />)
    expect(screen.getByRole('status')).toHaveTextContent('Verificando sessão')
  })

  it('usa um rotulo padrao', () => {
    render(<LoadingIndicator />)
    expect(screen.getByRole('status')).toHaveTextContent(/carregando/i)
  })
})
