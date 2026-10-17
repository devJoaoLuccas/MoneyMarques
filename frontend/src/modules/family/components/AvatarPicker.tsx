import { useId } from 'react'
import { FAMILY_AVATARS, type FamilyAvatar as FamilyAvatarId } from '../schemas/family.schemas'
import { AVATAR_ICONS } from './avatars'
import styles from './FamilyPanels.module.css'

interface AvatarPickerProps {
  value: FamilyAvatarId
  onChange: (value: FamilyAvatarId) => void
  error?: string
}

/** Escolha do icone da familia (apenas icones predefinidos no MVP, D-FAM-008). */
export function AvatarPicker({ value, onChange, error }: AvatarPickerProps) {
  const name = useId()
  return (
    <fieldset className={styles.avatars}>
      <legend className={styles.legend}>Ícone da família</legend>
      <div className={styles.avatarGrid}>
        {FAMILY_AVATARS.map((avatar) => {
          const { src, label } = AVATAR_ICONS[avatar]
          return (
            <label key={avatar} className={styles.avatarOption}>
              <input
                type="radio"
                name={name}
                value={avatar}
                checked={value === avatar}
                onChange={() => onChange(avatar)}
                className="visually-hidden"
              />
              <img className={styles.avatarImage} src={src} alt="" width={64} height={64} />
              <span className={styles.avatarLabel}>{label}</span>
            </label>
          )
        })}
      </div>
      {error && (
        <p role="alert" className={styles.fieldError}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
