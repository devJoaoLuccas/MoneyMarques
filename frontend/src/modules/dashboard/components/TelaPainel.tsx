import type { ReactNode } from 'react'
import { PaginaAutenticada } from '../../../shared/layouts/PaginaAutenticada/PaginaAutenticada'
import { rotuloPeriodo } from '../filtros/periodo'
import { useContextoPainel } from '../hooks/useContextoPainel'
import { usePainelRecurso, type ContextoPainel } from '../hooks/usePainel'
import type { RecursoPainel, RecursosPainel } from '../services/painel.service'
import type { VisaoFinanceira } from '../types'
import { EstadoConsulta } from './EstadoConsulta'

interface TelaPainelProps<R extends RecursoPainel> {
  recurso: R
  titulo: string
  /** O que carrega, para os estados de carregamento e erro ("os cartões"). */
  rotulo: string
  categoriaUid?: string
  /** Tela que ignora o periodo escolhido (ex.: projecao sempre parte do mes atual). */
  semPeriodo?: boolean
  children: (dados: RecursosPainel[R], contexto: { visao: VisaoFinanceira; periodo: string }) => ReactNode
}

function Consulta<R extends RecursoPainel>({
  recurso,
  rotulo,
  contexto,
  periodo,
  categoriaUid,
  children,
}: Pick<TelaPainelProps<R>, 'recurso' | 'rotulo' | 'categoriaUid' | 'children'> & {
  contexto: ContextoPainel
  periodo: string
}) {
  const consulta = usePainelRecurso(recurso, contexto, periodo, categoriaUid)
  return (
    <EstadoConsulta consulta={consulta} rotulo={rotulo}>
      {(dados) => children(dados, { visao: contexto.visao, periodo })}
    </EstadoConsulta>
  )
}

/** Moldura das telas do painel: titulo, escopo (pessoal/familiar) e os estados da consulta. */
export function TelaPainel<R extends RecursoPainel>({
  recurso,
  titulo,
  rotulo,
  categoriaUid,
  semPeriodo = false,
  children,
}: TelaPainelProps<R>) {
  const { contexto, periodo, visao } = useContextoPainel()
  if (!contexto) return null
  const escopo = visao === 'familiar' ? 'Finanças compartilhadas da família' : 'Suas finanças pessoais'
  return (
    <PaginaAutenticada title={titulo} subtitle={semPeriodo ? escopo : `${escopo} · ${rotuloPeriodo(periodo)}`}>
      <Consulta recurso={recurso} rotulo={rotulo} contexto={contexto} periodo={periodo} categoriaUid={categoriaUid}>
        {children}
      </Consulta>
    </PaginaAutenticada>
  )
}
