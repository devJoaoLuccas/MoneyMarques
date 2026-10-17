import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('comeca desmarcado e associa o label', () => {
    render(<Checkbox label="Manter sessão" />)
    expect(screen.getByRole('checkbox', { name: 'Manter sessão' })).not.toBeChecked()
  })

  it('alterna ao clicar no campo ou no texto do label', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Manter sessão" />)
    const box = screen.getByRole('checkbox', { name: 'Manter sessão' })
    await user.click(box)
    expect(box).toBeChecked()
    await user.click(screen.getByText('Manter sessão'))
    expect(box).not.toBeChecked()
  })

  it('aceita conteudo rico no label (links dos termos)', () => {
    render(
      <Checkbox
        label={
          <>
            Li e aceito os <a href="/termos">Termos de Uso</a>
          </>
        }
      />,
    )
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('mostra erro associado ao campo', () => {
    render(<Checkbox label="Aceito" error="Aceite os termos." />)
    const box = screen.getByRole('checkbox')
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box.getAttribute('aria-describedby')).toContain(screen.getByText('Aceite os termos.').id)
  })
})
