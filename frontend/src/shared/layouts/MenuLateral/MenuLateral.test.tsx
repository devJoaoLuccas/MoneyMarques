import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { BarraSuperior } from './BarraSuperior'
import { MenuLateral } from './MenuLateral'
import type { PapelMenu } from './menuConfig'

function Harness({
  papel = 'ADMINISTRADOR',
  recolhidoInicial = false,
}: {
  papel?: PapelMenu
  recolhidoInicial?: boolean
}) {
  const [recolhido, setRecolhido] = useState(recolhidoInicial)
  const [drawer, setDrawer] = useState(false)
  return (
    <>
      <BarraSuperior nome="Ana Maria" menuAberto={drawer} onAbrirMenu={() => setDrawer(true)} />
      <MenuLateral
        papel={papel}
        nome="Ana Maria"
        recolhido={recolhido}
        onAlternarRecolhido={() => setRecolhido((atual) => !atual)}
        drawerAberto={drawer}
        onFecharDrawer={() => setDrawer(false)}
      />
    </>
  )
}

const desktop = () => within(screen.getAllByRole('navigation', { name: 'Principal' })[0])

describe('MenuLateral', () => {
  it('lista os itens na ordem do menu de referencia', () => {
    renderWithProviders(<Harness />, { route: '/app' })
    const rotulos = desktop()
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(rotulos[0]).toMatch(/Início/)
    expect(rotulos[1]).toMatch(/Minha Vida Financeira/)
    expect(rotulos[2]).toMatch(/Gestão Familiar/)
  })

  it('marca o item ativo com aria-current e o rota correspondente', () => {
    renderWithProviders(<Harness />, { route: '/painel' })
    expect(desktop().getByRole('link', { name: 'Visão Geral' })).toHaveAttribute('aria-current', 'page')
    expect(desktop().getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  it('submenu usa aria-expanded e abre sozinho quando a rota esta nele', async () => {
    renderWithProviders(<Harness />, { route: '/app' })
    const grupo = desktop().getByRole('button', { name: /Gestão Familiar/ })
    expect(grupo).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(grupo)
    expect(grupo).toHaveAttribute('aria-expanded', 'true')
    expect(desktop().getByRole('link', { name: 'Integrantes' })).toBeVisible()
  })

  it('subitem da rota atual fica ativo e o grupo ja nasce aberto', () => {
    renderWithProviders(<Harness />, { route: '/familia/integrantes' })
    expect(desktop().getByRole('button', { name: /Gestão Familiar/ })).toHaveAttribute('aria-expanded', 'true')
    expect(desktop().getByRole('link', { name: 'Integrantes' })).toHaveAttribute('aria-current', 'page')
  })

  it('itens administrativos so aparecem para administradores (CA-FAM-007)', async () => {
    const { unmount } = renderWithProviders(<Harness papel="ADMINISTRADOR" />, { route: '/familia/integrantes' })
    expect(desktop().getByRole('link', { name: 'Convites' })).toBeInTheDocument()
    expect(desktop().getByText('Permissões')).toBeInTheDocument()
    unmount()

    renderWithProviders(<Harness papel="INTEGRANTE" />, { route: '/familia/integrantes' })
    expect(desktop().queryByRole('link', { name: 'Convites' })).not.toBeInTheDocument()
    expect(desktop().queryByText('Permissões')).not.toBeInTheDocument()
  })

  it('modulos inexistentes aparecem desabilitados, sem link', () => {
    renderWithProviders(<Harness />, { route: '/app' })
    const planejamento = desktop().getByRole('button', { name: /Planejamento/ })
    expect(planejamento).toBeDisabled()
    expect(desktop().queryByRole('link', { name: /Planejamento/ })).not.toBeInTheDocument()
  })

  it('modo compacto: itens so com icone mantem nome acessivel e tooltip', () => {
    renderWithProviders(<Harness recolhidoInicial />, { route: '/app' })
    const link = desktop().getByRole('link', { name: 'Início' })
    expect(link).toHaveAttribute('data-tooltip', 'Início')
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('alterna entre expandido e compacto', async () => {
    renderWithProviders(<Harness />, { route: '/app' })
    await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }))
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument()
  })

  describe('drawer mobile', () => {
    it('abre pelo hamburguer, prende o foco no botao fechar e fecha com Esc devolvendo o foco', async () => {
      renderWithProviders(<Harness />, { route: '/app' })
      const abrir = screen.getByRole('button', { name: 'Abrir menu' })
      await userEvent.click(abrir)
      const dialogo = screen.getByRole('dialog', { name: 'Menu principal' })
      expect(within(dialogo).getByRole('button', { name: 'Fechar menu' })).toHaveFocus()

      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(abrir).toHaveFocus()
    })

    it('fecha pelo botao X e mantem a mesma estrutura do desktop', async () => {
      renderWithProviders(<Harness />, { route: '/app' })
      await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      const dialogo = screen.getByRole('dialog')
      expect(within(dialogo).getByRole('link', { name: 'Início' })).toBeInTheDocument()
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Fechar menu' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('Tab nao escapa do drawer', async () => {
      renderWithProviders(<Harness />, { route: '/app' })
      await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      const dialogo = screen.getByRole('dialog')
      for (let i = 0; i < 20; i++) await userEvent.tab()
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    })

    it('fecha ao navegar', async () => {
      renderWithProviders(<Harness />, { route: '/painel' })
      await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }))
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Início' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
