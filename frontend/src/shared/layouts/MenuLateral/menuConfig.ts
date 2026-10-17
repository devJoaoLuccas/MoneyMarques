import type { IconType } from 'react-icons'
import { FiCalendar, FiFileText, FiHome, FiPieChart, FiTarget, FiTrendingUp, FiUsers } from 'react-icons/fi'
import { paths } from '../../routes/paths'

/** Papel familiar usado so para decidir o que mostrar (a autorizacao real e do servidor). */
export type PapelMenu = 'ADMINISTRADOR' | 'INTEGRANTE' | 'VISUALIZADOR'

export interface ItemMenu {
  id: string
  rotulo: string
  icone?: IconType
  /** Sem rota: o item ou ainda nao existe (`emBreve`) ou apenas abre o submenu. */
  rota?: string
  filhos?: ItemMenu[]
  permissaoMinima?: PapelMenu
  /** Modulo ainda nao implementado: aparece desabilitado, sem rota inventada. */
  emBreve?: boolean
}

/** Estrutura unica de navegacao (dados, nao JSX repetido). Ordem da imagem "Menu Lateral". */
export const itensMenu: readonly ItemMenu[] = [
  { id: 'inicio', rotulo: 'Início', icone: FiHome, rota: paths.app },
  {
    id: 'minha-vida-financeira',
    rotulo: 'Minha Vida Financeira',
    icone: FiPieChart,
    filhos: [
      { id: 'painel-visao-geral', rotulo: 'Visão Geral', rota: paths.dashboard },
      { id: 'painel-receitas-despesas', rotulo: 'Receitas e Despesas', rota: paths.dashboardIncomeExpenses },
      { id: 'painel-cartoes', rotulo: 'Cartões e Faturas', rota: paths.dashboardCards },
      { id: 'painel-patrimonio', rotulo: 'Patrimônio', rota: paths.dashboardNetWorth },
      { id: 'painel-projecoes', rotulo: 'Projeções', rota: paths.dashboardProjections },
      { id: 'painel-vencimentos', rotulo: 'Vencimentos', rota: paths.dashboardDueDates },
    ],
  },
  {
    id: 'gestao-familiar',
    rotulo: 'Gestão Familiar',
    icone: FiUsers,
    filhos: [
      { id: 'familia-visao-geral', rotulo: 'Visão Geral', emBreve: true },
      {
        id: 'familia-integrantes',
        rotulo: 'Integrantes',
        rota: paths.familyMembers,
      },
      {
        id: 'familia-convites',
        rotulo: 'Convites',
        rota: paths.familySentInvites,
        permissaoMinima: 'ADMINISTRADOR',
      },
      {
        id: 'familia-permissoes',
        rotulo: 'Permissões',
        emBreve: true,
        permissaoMinima: 'ADMINISTRADOR',
      },
      {
        id: 'familia-configuracoes',
        rotulo: 'Configurações',
        emBreve: true,
        permissaoMinima: 'ADMINISTRADOR',
      },
    ],
  },
  {
    id: 'planejamento',
    rotulo: 'Planejamento',
    icone: FiCalendar,
    emBreve: true,
  },
  { id: 'metas', rotulo: 'Metas', icone: FiTarget, emBreve: true },
  {
    id: 'investimentos',
    rotulo: 'Investimentos',
    icone: FiTrendingUp,
    emBreve: true,
  },
  { id: 'relatorios', rotulo: 'Relatórios', icone: FiFileText, emBreve: true },
]

const ordemPapel: Record<PapelMenu, number> = {
  VISUALIZADOR: 0,
  INTEGRANTE: 1,
  ADMINISTRADOR: 2,
}

export function papelAtende(papel: PapelMenu, minimo?: PapelMenu): boolean {
  return minimo === undefined || ordemPapel[papel] >= ordemPapel[minimo]
}

/** Remove o que o papel nao pode ver (CA-FAM-007). Conveniencia de UX: o servidor autoriza. */
export function filtrarItensMenu(itens: readonly ItemMenu[], papel: PapelMenu): ItemMenu[] {
  return itens
    .filter((item) => papelAtende(papel, item.permissaoMinima))
    .map((item) => (item.filhos ? { ...item, filhos: filtrarItensMenu(item.filhos, papel) } : item))
}

/** Papel por extenso para o bloco de perfil. */
export const rotuloPapel: Record<PapelMenu, string> = {
  ADMINISTRADOR: 'Administrador',
  INTEGRANTE: 'Integrante',
  VISUALIZADOR: 'Visualizador',
}
