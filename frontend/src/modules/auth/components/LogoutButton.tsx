import type { ButtonProps } from '../../../shared/ui/Button/Button'
import { useNavigate } from 'react-router-dom'
import { paths } from '../../../shared/routes/paths'
import { Button } from '../../../shared/ui'
import { useLogout } from '../hooks/useAuthMutations'

interface LogoutButtonProps {
  variant?: ButtonProps['variant']
  label?: string
}

/** Encerra a sessao no servidor, limpa o cache local e volta ao login. */
export function LogoutButton({ variant = 'secondary', label = 'Sair' }: LogoutButtonProps) {
  const navigate = useNavigate()
  const logout = useLogout()

  return (
    <Button
      variant={variant}
      loading={logout.isPending}
      onClick={() => logout.mutate(undefined, { onSettled: () => navigate(paths.login, { replace: true }) })}
    >
      {label}
    </Button>
  )
}
