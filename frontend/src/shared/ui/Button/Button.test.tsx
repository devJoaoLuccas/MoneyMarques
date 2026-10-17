import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('usa type="button" por padrao para nao enviar formularios sem querer', () => {
    render(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button')
  })

  it('permite type="submit"', () => {
    render(<Button type="submit">Entrar</Button>)
    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('type', 'submit')
  })

  it('dispara onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Clique</Button>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Clique' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('em carregamento fica ocupado, desabilitado e nao dispara cliques duplicados', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Entrar
      </Button>,
    )
    const button = screen.getByRole('button', { name: /entrar/i })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    await userEvent.setup().click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('em carregamento anuncia o progresso por texto acessivel (nao so visual)', () => {
    render(<Button loading>Entrar</Button>)
    expect(screen.getByRole('button')).toHaveTextContent(/carregando/i)
  })

  it('respeita disabled', () => {
    render(<Button disabled>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })
})
