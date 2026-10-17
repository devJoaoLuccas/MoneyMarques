import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tabs } from './Tabs'

const tabs = [
  { id: 'a', label: 'Primeira', panel: <p>Conteúdo A</p> },
  { id: 'b', label: 'Segunda', panel: <p>Conteúdo B</p> },
  { id: 'c', label: 'Terceira', panel: <p>Conteúdo C</p> },
]

describe('Tabs', () => {
  it('mostra so o painel da aba ativa, ligado a ela por aria', () => {
    render(<Tabs label="Opções" tabs={tabs} />)
    expect(screen.getByRole('tablist', { name: 'Opções' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Primeira' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Primeira' })).toHaveTextContent('Conteúdo A')
    expect(screen.queryByText('Conteúdo B')).not.toBeInTheDocument()
  })

  it('so a aba ativa entra na ordem de Tab', () => {
    render(<Tabs label="Opções" tabs={tabs} />)
    expect(screen.getByRole('tab', { name: 'Primeira' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveAttribute('tabindex', '-1')
  })

  it('clique troca de aba', async () => {
    render(<Tabs label="Opções" tabs={tabs} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Segunda' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo B')
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveAttribute('aria-selected', 'true')
  })

  it('setas, Home e End movem foco e selecao, com volta nas pontas', async () => {
    render(<Tabs label="Opções" tabs={tabs} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Primeira' }))

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo B')

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Terceira' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Primeira' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Terceira' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Primeira' })).toHaveFocus()
  })

  it('respeita a aba inicial', () => {
    render(<Tabs label="Opções" tabs={tabs} initialId="c" />)
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Conteúdo C')
  })
})
