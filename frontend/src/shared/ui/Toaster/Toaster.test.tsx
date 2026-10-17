import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { notify } from '../../lib/toast'
import { Toaster } from './Toaster'

describe('Toaster / notify', () => {
  it('mostra o aviso de sucesso e permite fecha-lo', async () => {
    render(<Toaster />)
    act(() => {
      notify.success('Código copiado.')
    })
    expect(await screen.findByText('Código copiado.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /close toast/i }))
    await waitFor(() => expect(screen.queryByText('Código copiado.')).not.toBeInTheDocument())
  })

  it('mostra erros e informacoes como avisos distintos', async () => {
    render(<Toaster />)
    act(() => {
      notify.error('Não foi possível concluir.')
      notify.info('Atualizado.')
    })
    expect(await screen.findByText('Não foi possível concluir.')).toBeInTheDocument()
    expect(await screen.findByText('Atualizado.')).toBeInTheDocument()
  })

  it('dismissAll limpa os avisos', async () => {
    render(<Toaster />)
    act(() => {
      notify.success('Um aviso.')
    })
    await screen.findByText('Um aviso.')
    act(() => notify.dismissAll())
    await waitFor(() => expect(screen.queryByText('Um aviso.')).not.toBeInTheDocument())
  })
})
