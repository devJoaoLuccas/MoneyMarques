import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toApiError } from '../../../shared/lib/api-error'
import { applyFieldErrors, describeApiError } from '../../../shared/lib/form-errors'
import { paths } from '../../../shared/routes/paths'
import { Alert, Button, TextField } from '../../../shared/ui'
import { useCreateFamily } from '../hooks/useFamily'
import {
  createFamilySchema,
  FAMILY_DESCRIPTION_MAX,
  FAMILY_NAME_MAX,
  type CreateFamilyFormValues,
  type CreateFamilyPayload,
} from '../schemas/family.schemas'
import { AvatarPicker } from './AvatarPicker'
import styles from './FamilyPanels.module.css'

const FIELDS = ['nome', 'descricao', 'avatar'] as const

/** FAM-001: criar o grupo familiar. O criador passa a ser o administrador (RN-FAM-001). */
export function CreateFamilyForm() {
  const navigate = useNavigate()
  const createFamily = useCreateFamily()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateFamilyFormValues, unknown, CreateFamilyPayload>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { nome: '', descricao: '', avatar: 'casa' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (createFamily.isPending) return
    setFormError(null)
    try {
      await createFamily.mutateAsync(values)
      navigate(paths.app, { replace: true })
    } catch (cause) {
      const error = toApiError(cause)
      if (!applyFieldErrors<CreateFamilyFormValues>(error, FIELDS, setError)) {
        setFormError(describeApiError(error))
      }
    }
  })

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {formError && <Alert variant="error">{formError}</Alert>}

      <TextField
        label="Nome da família"
        autoComplete="off"
        maxLength={FAMILY_NAME_MAX + 20}
        hint="Entre 3 e 40 caracteres."
        error={errors.nome?.message}
        {...register('nome')}
      />
      <TextField
        label="Descrição (opcional)"
        autoComplete="off"
        maxLength={FAMILY_DESCRIPTION_MAX + 20}
        error={errors.descricao?.message}
        {...register('descricao')}
      />
      <Controller
        control={control}
        name="avatar"
        render={({ field }) => (
          <AvatarPicker value={field.value} onChange={field.onChange} error={errors.avatar?.message} />
        )}
      />

      <Button type="submit" fullWidth loading={createFamily.isPending}>
        Criar família
      </Button>
    </form>
  )
}
