import { useId, type ReactNode } from 'react'
import { FiBarChart2, FiTarget, FiAward } from 'react-icons/fi'
import logoHorizontal from '../../../assets/brand/logo-horizontal.webp'
import styles from './BrandLayout.module.css'

interface BrandLayoutProps {
  title: string
  subtitle?: string
  /** Chamada curta acima do titulo (ex.: "Bem-vindo de volta"). */
  eyebrow?: string
  children: ReactNode
}

const benefits = [
  { icon: FiBarChart2, text: 'Tenha visão total das suas finanças' },
  { icon: FiTarget, text: 'Crie metas e alcance seus objetivos' },
  { icon: FiAward, text: 'Construa um futuro extraordinário' },
]

/**
 * Layout de identidade da marca: fundo da marca em tela cheia com painel de
 * mensagem (desktop) + cartao de vidro com o conteudo; no mobile, cabecalho
 * compacto e prioridade ao conteudo. Usa apenas os assets oficiais.
 */
export function BrandLayout({ title, subtitle, eyebrow, children }: BrandLayoutProps) {
  const titleId = useId()

  return (
    <div className={styles.page}>
      <header className={styles.brand}>
        <img className={styles.logo} src={logoHorizontal} alt="Money Marques" width={900} height={506} />
        <div className={styles.hero}>
          <p className={styles.slogan}>
            <span>Controle.</span>
            <span>Planeje.</span>
            <span className={styles.sloganAccent}>Evolua.</span>
          </p>
          <p className={styles.lead}>
            Mais que finanças. Um estilo de vida com liberdade, disciplina e grandes planos.
          </p>
          <ul className={styles.benefits}>
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className={styles.benefit}>
                <span className={styles.benefitIcon}>
                  <Icon aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card} aria-labelledby={titleId}>
          <header className={styles.header}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h1 id={titleId} className={styles.title}>
              {title}
            </h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </header>
          {children}
        </section>
      </main>
    </div>
  )
}
