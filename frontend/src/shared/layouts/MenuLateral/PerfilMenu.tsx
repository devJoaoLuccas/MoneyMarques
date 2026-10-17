import type { ReactNode } from 'react'
import { iniciais } from './iniciais'
import styles from './MenuLateral.module.css'

interface PerfilMenuProps {
  nome: string
  papel: string
  /** Acao de sair (injetada para o layout nao depender do modulo de autenticacao). */
  acaoSair?: ReactNode
  compacto: boolean
}

/** Bloco de perfil do rodape do menu: avatar, nome, papel e acao de sair. */
export function PerfilMenu({ nome, papel, acaoSair, compacto }: PerfilMenuProps) {
  return (
    <div className={styles.perfil}>
      <span className={styles.avatar} aria-hidden="true">
        {iniciais(nome)}
      </span>
      {!compacto && (
        <>
          <div className={styles.perfilTexto}>
            <span className={styles.perfilNome}>{nome}</span>
            <span className={styles.perfilPapel}>{papel}</span>
          </div>
          {acaoSair}
        </>
      )}
    </div>
  )
}
