import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  NormalizeEmail,
  NormalizeName,
  TrimString,
} from '../../auth/dto/transforms';
import {
  FAMILY_AVATARS,
  FAMILY_DESCRIPTION_MAX,
  FAMILY_NAME_MAX,
  FAMILY_NAME_MIN,
  PAGE_SIZE_MAX,
} from '../family.constants';

const PAPEIS = ['ADMINISTRADOR', 'INTEGRANTE', 'VISUALIZADOR'] as const;
type Papel = (typeof PAPEIS)[number];

const EMAIL_MESSAGE = 'Informe um e-mail válido.';

/** Descricao vazia vira ausente (normaliza espacos). */
const NormalizeDescription = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const text = value.trim().replace(/\s+/g, ' ');
    return text === '' ? undefined : text;
  });

export class CreateFamilyDto {
  @NormalizeName()
  @IsString({ message: 'Informe o nome da família.' })
  @Length(FAMILY_NAME_MIN, FAMILY_NAME_MAX, {
    message: `O nome deve ter entre ${FAMILY_NAME_MIN} e ${FAMILY_NAME_MAX} caracteres.`,
  })
  nome!: string;

  @IsOptional()
  @NormalizeDescription()
  @IsString()
  @MaxLength(FAMILY_DESCRIPTION_MAX, {
    message: `A descrição deve ter até ${FAMILY_DESCRIPTION_MAX} caracteres.`,
  })
  descricao?: string;

  @IsOptional()
  @IsIn(FAMILY_AVATARS, { message: 'Escolha um dos ícones disponíveis.' })
  avatar?: string;
}

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Página inválida.' })
  @Min(1, { message: 'Página inválida.' })
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Tamanho inválido.' })
  @Min(1, { message: 'Tamanho inválido.' })
  @Max(PAGE_SIZE_MAX, { message: `Tamanho máximo: ${PAGE_SIZE_MAX}.` })
  tamanho?: number;
}

export class ListMembersQueryDto extends PageQueryDto {
  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsIn(PAPEIS)
  papel?: Papel;

  @IsOptional()
  @IsIn(['ATIVO', 'REMOVIDO'])
  situacao?: 'ATIVO' | 'REMOVIDO';
}

export class UpdateMemberDto {
  @IsIn(PAPEIS, { message: 'Papel inválido.' })
  papel!: Papel;

  /** D-FAM-004: promover a administrador exige confirmacao explicita. */
  @IsOptional()
  @IsBoolean()
  confirmarPromocao?: boolean;
}

export class IssueInviteDto {
  @NormalizeEmail()
  @IsEmail({}, { message: EMAIL_MESSAGE })
  @MaxLength(254, { message: EMAIL_MESSAGE })
  email!: string;

  /** D-FAM-001: o administrador convida os tres papeis; padrao INTEGRANTE. */
  @IsOptional()
  @IsIn(PAPEIS, { message: 'Papel inválido.' })
  papel?: Papel;
}

export class ListInvitesQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['PENDENTE', 'ACEITO', 'RECUSADO', 'EXPIRADO', 'REVOGADO'])
  situacao?: 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'EXPIRADO' | 'REVOGADO';
}

/** O token vai no corpo (nunca na URL), para nao cair em logs nem na auditoria. */
export class InviteTokenDto {
  @TrimString()
  @IsString()
  @IsNotEmpty({ message: 'Link inválido.' })
  @MaxLength(256, { message: 'Link inválido.' })
  token!: string;
}
