import { describe, expect, it } from 'vitest'
import type { SessionView } from '../types'
import { resolveDestination } from './resolve-destination'

const user = { uid: 'u1', nomeCompleto: 'Ana', email: 'ana@exemplo.com' }
const familia = (uid: string) => ({ uid, nome: `Familia ${uid}`, papel: 'ADMINISTRADOR' })

const authenticated = (contexto: Partial<Extract<SessionView, { status: 'authenticated' }>['contexto']>) =>
  ({
    status: 'authenticated',
    usuario: user,
    mfaHabilitado: false,
    contexto: { tipo: 'sem_familia', familias: [], convitesPendentes: [], ...contexto },
  }) as SessionView

describe('resolveDestination (fluxo geral e AUTH-005)', () => {
  it('sem sessao vai para o login', () => {
    expect(resolveDestination({ status: 'auth_required' })).toBe('/login')
  })

  it('e-mail pendente vai para a confirmacao de e-mail', () => {
    expect(
      resolveDestination({ status: 'email_verification_required', usuario: { email: 'a@b.com' }, mfaHabilitado: false }),
    ).toBe('/verificar-email')
  })

  it('MFA pendente vai para a verificacao em duas etapas', () => {
    expect(
      resolveDestination({ status: 'mfa_required', usuario: { email: 'a@b.com' }, mfaHabilitado: true }),
    ).toBe('/verificacao-mfa')
  })

  it('sem familia: onboarding familiar', () => {
    expect(resolveDestination(authenticated({ tipo: 'sem_familia' }))).toBe('/familia/nova')
  })

  it('convite pendente: fluxo de aceite', () => {
    expect(
      resolveDestination(
        authenticated({
          tipo: 'convite_pendente',
          convitesPendentes: [{ uid: 'c1', familiaNome: 'Silva', papelOferecido: 'INTEGRANTE' }],
        }),
      ),
    ).toBe('/familia/convites')
  })

  it('uma unica familia: entra direto', () => {
    expect(resolveDestination(authenticated({ tipo: 'unico', familias: [familia('f1')] }))).toBe('/app')
  })

  it('varias familias sem escolha previa: abre a selecao', () => {
    expect(
      resolveDestination(authenticated({ tipo: 'multiplo', familias: [familia('f1'), familia('f2')] })),
    ).toBe('/contexto')
  })

  it('varias familias com escolha valida: entra na escolhida', () => {
    const session = authenticated({ tipo: 'multiplo', familias: [familia('f1'), familia('f2')] })
    expect(resolveDestination(session, 'f2')).toBe('/app')
  })

  it('escolha de familia que o usuario nao integra e ignorada (nao e autorizacao)', () => {
    const session = authenticated({ tipo: 'multiplo', familias: [familia('f1'), familia('f2')] })
    expect(resolveDestination(session, 'familia-alheia')).toBe('/contexto')
  })
})
