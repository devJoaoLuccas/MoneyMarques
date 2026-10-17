import { BrandLayout } from '../../../shared/layouts/BrandLayout/BrandLayout'
import { Tabs } from '../../../shared/ui'
import { LogoutButton } from '../../auth'
import { CreateFamilyForm } from '../components/CreateFamilyForm'
import { JoinWithCodeForm } from '../components/JoinWithCodeForm'
import styles from '../components/FamilyPanels.module.css'

/** Destino da transicao AUTH-005 para quem ainda nao tem familia (FAM-001, D-FAM-009). */
export function FamilyOnboardingPage() {
  return (
    <BrandLayout
      eyebrow="Primeiro passo"
      title="Crie ou entre em uma família"
      subtitle="Reúna as finanças de quem divide a vida com você."
    >
      <Tabs
        label="Como começar"
        tabs={[
          {
            id: 'criar',
            label: 'Criar família',
            panel: (
              <>
                <p className={styles.cardMeta}>Ao criar uma família, você será o administrador.</p>
                <CreateFamilyForm />
              </>
            ),
          },
          {
            id: 'entrar',
            label: 'Entrar na família',
            panel: (
              <>
                <p className={styles.cardMeta}>
                  Recebeu um código de convite? Digite abaixo. Se o convite foi enviado para o seu e-mail, ele aparece
                  aqui quando você entra com o mesmo e-mail.
                </p>
                <JoinWithCodeForm />
              </>
            ),
          },
        ]}
      />
      <LogoutButton variant="ghost" label="Sair da conta" />
    </BrandLayout>
  )
}
