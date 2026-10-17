import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordStrength } from './PasswordStrength'

const requirements = (met: boolean[]) => met.map((value, index) => ({ id: `r${index}`, label: `Regra ${index}`, met: value }))

describe('PasswordStrength', () => {
  it('nao renderiza nada quando vazio', () => {
    const { container } = render(<PasswordStrength requirements={requirements([false, false])} empty />)
    expect(container).toBeEmptyDOMElement()
  })

  it('classifica como fraca, media e forte conforme os requisitos atendidos', () => {
    const { rerender } = render(<PasswordStrength requirements={requirements([true, false, false, false, false])} />)
    expect(screen.getByText('Senha fraca')).toBeInTheDocument()

    rerender(<PasswordStrength requirements={requirements([true, true, true, false, false])} />)
    expect(screen.getByText('Senha média')).toBeInTheDocument()

    rerender(<PasswordStrength requirements={requirements([true, true, true, true, true])} />)
    expect(screen.getByText('Senha forte')).toBeInTheDocument()
    expect(screen.getAllByText('(atendido)', { exact: false })).toHaveLength(5)
  })
})
