import casa from '../../../assets/icones/icone-casa.webp'
import casal from '../../../assets/icones/icone-casal.webp'
import familia from '../../../assets/icones/icone-familia.webp'
import type { FamilyAvatar } from '../schemas/family.schemas'

/** Icones oficiais da familia (D-FAM-008: sem upload no MVP). */
export const AVATAR_ICONS: Record<FamilyAvatar, { src: string; label: string }> = {
  casa: { src: casa, label: 'Casa' },
  casal: { src: casal, label: 'Casal' },
  familia: { src: familia, label: 'Família' },
}
