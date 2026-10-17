import { describe, expect, it } from 'vitest'
import { filtrarItensMenu, itensMenu, papelAtende, type ItemMenu } from './menuConfig'

const idsFilhos = (itens: ItemMenu[]) => itens.find((item) => item.id === 'gestao-familiar')?.filhos?.map((f) => f.id)

describe('menuConfig', () => {
  it('segue a ordem do menu de referencia', () => {
    expect(itensMenu.map((item) => item.rotulo)).toEqual([
      'Início',
      'Minha Vida Financeira',
      'Gestão Familiar',
      'Planejamento',
      'Metas',
      'Investimentos',
      'Relatórios',
    ])
  })

  it('administrador ve todos os subitens da gestao familiar', () => {
    expect(idsFilhos(filtrarItensMenu(itensMenu, 'ADMINISTRADOR'))).toEqual([
      'familia-visao-geral',
      'familia-integrantes',
      'familia-convites',
      'familia-permissoes',
      'familia-configuracoes',
    ])
  })

  it.each(['INTEGRANTE', 'VISUALIZADOR'] as const)('%s nao ve itens administrativos (CA-FAM-007)', (papel) => {
    expect(idsFilhos(filtrarItensMenu(itensMenu, papel))).toEqual(['familia-visao-geral', 'familia-integrantes'])
  })

  it('papelAtende respeita a hierarquia', () => {
    expect(papelAtende('INTEGRANTE', undefined)).toBe(true)
    expect(papelAtende('INTEGRANTE', 'ADMINISTRADOR')).toBe(false)
    expect(papelAtende('ADMINISTRADOR', 'INTEGRANTE')).toBe(true)
  })

  it('itens sem modulo nao tem rota inventada', () => {
    const semRota = itensMenu.filter((item) => item.emBreve)
    expect(semRota.every((item) => item.rota === undefined)).toBe(true)
  })
})
