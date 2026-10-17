import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MascaraValores } from './MascaraValores'
import { PrivacidadeProvider } from './PrivacidadeProvider'
import { usePrivacidade } from './usePrivacidade'

function Alternador() {
  const { alternar } = usePrivacidade()
  return <button onClick={alternar}>alternar</button>
}

function setup(centavos: string | null) {
  render(
    <PrivacidadeProvider>
      <Alternador />
      <MascaraValores centavos={centavos} />
    </PrivacidadeProvider>,
  )
}

describe('MascaraValores', () => {
  it('mostra o valor em BRL e o mascara ao ocultar', async () => {
    window.localStorage.clear()
    setup('125000')
    expect(screen.getByText(/^R\$\s1\.250,00$/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'alternar' }))
    expect(screen.queryByText(/1\.250/)).not.toBeInTheDocument()
    expect(screen.getByText('R$ ••••')).toBeInTheDocument()
    window.localStorage.clear()
  })

  it('valor ausente nao vira zero', () => {
    window.localStorage.clear()
    setup(null)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/0,00/)).not.toBeInTheDocument()
  })
})
