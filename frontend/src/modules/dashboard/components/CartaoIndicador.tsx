import type { ReactNode } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { cn } from '../../../shared/lib/cn'
import { MascaraValores, usePrivacidade } from '../../../shared/ui'
import { formatarDataCivil, rotuloPeriodo } from '../filtros/periodo'
import type { IndicadorFinanceiro } from '../types'
import styles from './CartaoIndicador.module.css'

interface CartaoIndicadorProps {
  titulo: string
  indicador: IndicadorFinanceiro
  /** Indicador de destaque (ex.: Saldo Projetado do Mes), separado dos KPIs de linha. */
  destaque?: boolean
  /** Texto extra abaixo da referencia (ex.: variacao sobre o periodo anterior). */
  complemento?: ReactNode
}

const ESCOPO = { pessoal: 'Pessoal', familiar: 'Familiar' } as const

function textoReferencia({ referencia }: IndicadorFinanceiro): string {
  return referencia.tipo === 'periodo'
    ? rotuloPeriodo(referencia.valor)
    : `Posição em ${formatarDataCivil(referencia.valor)}`
}

/**
 * KPI do painel: valor, escopo e referencia temporal sempre juntos. Valor
 * indisponivel nunca aparece como zero; indicador parcial explica o que falta.
 */
export function CartaoIndicador({ titulo, indicador, destaque = false, complemento }: CartaoIndicadorProps) {
  const { ocultar } = usePrivacidade()
  const { valorCentavos, parcial, observacao } = indicador
  const negativo = !ocultar && valorCentavos?.startsWith('-')

  return (
    <article className={cn(styles.cartao, destaque && styles.destaque)} aria-label={titulo}>
      <h3 className={styles.titulo}>{titulo}</h3>
      <p className={cn(styles.valor, negativo && styles.negativo)}>
        <MascaraValores centavos={valorCentavos} />
        {valorCentavos === null && <span className="visually-hidden">Indisponível</span>}
      </p>
      <p className={styles.meta}>
        <span className={styles.escopo}>{ESCOPO[indicador.escopo]}</span>
        <span>{textoReferencia(indicador)}</span>
      </p>
      {complemento && <p className={styles.meta}>{complemento}</p>}
      {observacao && (
        <p className={styles.observacao}>
          {parcial && <FiAlertTriangle aria-hidden="true" />}
          <span>
            {parcial && <strong>Parcial. </strong>}
            {observacao}
          </span>
        </p>
      )}
    </article>
  )
}
