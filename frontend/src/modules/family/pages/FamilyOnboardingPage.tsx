import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { CreateFamilyForm } from '../components/CreateFamilyForm'
import { JoinWithCodeForm } from '../components/JoinWithCodeForm'
import styles from '../components/FamilyPanels.module.css'

/** Destino da transicao AUTH-005 para quem ainda nao tem familia (FAM-001, D-FAM-009). */
export function FamilyOnboardingPage() {
  return (
    <BrandLayout
      eyebrow="Primeiro passo"
      title="Crie ou entre em uma família"
      subtitle="Reúna as finanças de quem divide a vida com você. Ao criar, você será o administrador."
    >
      <CreateFamilyForm />
      <section className={styles.divider} aria-labelledby="entrar-familia">
        <h2 id="entrar-familia" className={styles.cardTitle}>
          Já tem um código ou convite?
        </h2>
        <p className={styles.cardMeta}>
          Se um administrador enviou o convite para o seu e-mail, ele aparece aqui quando você entra com o mesmo e-mail.
          Se recebeu um código, digite abaixo.
        </p>
        <JoinWithCodeForm />
      </section>
    </BrandLayout>
  )
}
